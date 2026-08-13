import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Booking, Ride, Vehicle } from '../entities/entities';
import type { RecurrenceRule } from '../entities/entities';
import { ECO_FUEL_TYPES, RideOccurrence } from '../common/types';
import { addDays, haversineKm, toDateStr } from '../common/geo';
import { CreateRideDto, UpdateRideDto } from '../dto/dto';

const MAX_RECURRENCE_DAYS = 366; // 12 meses
const OVERLAP_MINUTES = 30;

export interface SearchQuery {
  origin?: string;
  dest?: string;
  date?: string; // YYYY-MM-DD; vacío → próximos 7 días
  seats?: string;
  eco?: string;
  minRating?: string;
}

@Injectable()
export class RidesService {
  constructor(
    @InjectRepository(Ride) private readonly ridesRepo: Repository<Ride>,
    @InjectRepository(Booking) private readonly bookingsRepo: Repository<Booking>,
    @InjectRepository(Vehicle) private readonly vehiclesRepo: Repository<Vehicle>,
    private readonly dataSource: DataSource,
  ) {}

  /** Distancia y tiempo del trayecto (haversine). */
  private routeInfo(ride: Pick<Ride, 'originLat' | 'originLng' | 'destLat' | 'destLng'>) {
    const km = haversineKm(ride.originLat, ride.originLng, ride.destLat, ride.destLng);
    return { distanceKm: Math.round(km * 10) / 10 };
  }

  /** Carga las reservas activas (pending/confirmed) de un conjunto de rides. */
  private async activeBookingsByRide(rideIds: string[]) {
    if (rideIds.length === 0) return new Map<string, Booking[]>();
    const bookings = await this.bookingsRepo.find({
      where: rideIds.map((rideId) => ({ rideId, status: 'pending' as const })),
    });
    const confirmed = await this.bookingsRepo.find({
      where: rideIds.map((rideId) => ({ rideId, status: 'confirmed' as const })),
    });
    const map = new Map<string, Booking[]>();
    for (const b of [...bookings, ...confirmed]) {
      const arr = map.get(b.rideId) ?? [];
      arr.push(b);
      map.set(b.rideId, arr);
    }
    return map;
  }

  /**
   * Expande las ocurrencias de un viaje en el rango [from, to] (inclusivo).
   * Recurrente → días de la semana de la regla; puntual → su fecha si cae en el rango.
   */
  occurrencesForRide(
    ride: Ride,
    from: string,
    to: string,
    bookingsByRide: Map<string, Booking[]>,
  ): RideOccurrence[] {
    const out: RideOccurrence[] = [];
    const fromDate = new Date(from + 'T00:00:00');
    const toDate = new Date(to + 'T00:00:00');

    if (ride.recurrence) {
      const rule = ride.recurrence;
      const end = new Date(rule.endDate + 'T00:00:00');
      const cursor = new Date(fromDate);
      while (cursor <= toDate) {
        if (cursor > end) break;
        const dow = cursor.getDay() === 0 ? 7 : cursor.getDay(); // 1=lun…7=dom
        if (rule.weekdays.includes(dow)) {
          const date = toDateStr(cursor);
          const bs = (bookingsByRide.get(ride.id) ?? []).filter((b) => b.occurrenceDate === date);
          const booked = bs.reduce((s, b) => s + b.seats, 0);
          out.push({
            rideId: ride.id,
            date,
            time: rule.time,
            availableSeats: Math.max(0, ride.seats - booked),
            bookedSeats: booked,
          });
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    } else {
      const base = ride.datetime.slice(0, 10);
      if (base >= from && base <= to) {
        const bs = (bookingsByRide.get(ride.id) ?? []).filter((b) => b.occurrenceDate === base);
        const booked = bs.reduce((s, b) => s + b.seats, 0);
        out.push({
          rideId: ride.id,
          date: base,
          time: ride.datetime.slice(11, 16),
          availableSeats: Math.max(0, ride.seats - booked),
          bookedSeats: booked,
        });
      }
    }
    out.sort((a, b) => (a.date < b.date ? -1 : 1));
    return out;
  }

  async create(userId: string, dto: CreateRideDto) {
    const datetime = new Date(dto.datetime);
    if (Number.isNaN(datetime.getTime())) {
      throw new BadRequestException('Fecha/hora inválida');
    }
    if (datetime.getTime() <= Date.now()) {
      throw new BadRequestException('La fecha debe ser futura');
    }
    const price = dto.price ?? 2.5;
    if (price < 0.5 || price > 50) {
      throw new BadRequestException('El precio debe estar entre 0,50 € y 50 €');
    }
    if (dto.seats < 1 || dto.seats > 8) {
      throw new BadRequestException('Las plazas deben estar entre 1 y 8');
    }
    const vehicle = await this.vehiclesRepo.findOne({
      where: { id: dto.vehicleId, ownerId: userId },
    });
    if (!vehicle) {
      throw new BadRequestException('Vehículo no encontrado o no es tuyo');
    }

    let recurrence: RecurrenceRule | null = null;
    if (dto.recurrence) {
      const start = toDateStr(datetime);
      const end = dto.recurrence.endDate;
      const days = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000);
      if (days < 0 || days > MAX_RECURRENCE_DAYS) {
        throw new BadRequestException('El rango de recurrencia no puede superar 12 meses');
      }
      recurrence = {
        weekdays: dto.recurrence.weekdays,
        time: dto.recurrence.time,
        endDate: end,
      };
    }

    // Solapamiento: otro viaje activo del conductor ±30 min alrededor de la nueva fecha
    const overlap = await this.ridesRepo
      .createQueryBuilder('r')
      .where('r.driverId = :driverId', { driverId: userId })
      .andWhere("r.status = 'active'")
      .andWhere('r.datetime BETWEEN :from AND :to', {
        from: new Date(datetime.getTime() - OVERLAP_MINUTES * 60_000).toISOString(),
        to: new Date(datetime.getTime() + OVERLAP_MINUTES * 60_000).toISOString(),
      })
      .getCount();
    if (overlap > 0) {
      throw new ConflictException('Ya tienes un viaje a esa hora');
    }

    // Geocodificación simulada: si faltan lat/lng se usan coords por defecto del lugar
    const ride = (await this.ridesRepo.save(
      this.ridesRepo.create({
        driverId: userId,
        vehicleId: dto.vehicleId,
        origin: dto.origin,
        dest: dto.dest,
        originLat: dto.originLat ?? 40.4168,
        originLng: dto.originLng ?? -3.7038,
        destLat: dto.destLat ?? 40.505,
        destLng: dto.destLng ?? -3.655,
        datetime: datetime.toISOString(),
        seats: dto.seats,
        price,
        recurrence,
        status: 'active',
        notes: dto.notes ?? null,
      } as any),
    )) as unknown as Ride;

    const info = this.routeInfo(ride);
    return {
      ...ride,
      ...info,
      rideType: recurrence ? 'recurring' : 'oneoff',
    };
  }

  async search(query: SearchQuery) {
    const date = query.date || toDateStr(new Date());
    const to = addDays(new Date(date + 'T00:00:00'), 7);
    const toStr = toDateStr(to);

    // Candidatos: viajes activos cuyo rango de ocurrencia toca [date, toStr]
    const all = await this.ridesRepo.find({
      where: { status: 'active' },
      relations: { driver: true, vehicle: true },
      order: { datetime: 'ASC' },
    });
    const bookingsByRide = await this.activeBookingsByRide(all.map((r) => r.id));

    const results: Array<
      RideOccurrence & {
        ride: Ride;
        driverName: string;
        driverRating: number;
        vehicleEco: boolean;
        distanceKm: number;
      }
    > = [];

    for (const ride of all) {
      if (ride.recurrence) {
        const recEnd = ride.recurrence.endDate;
        if (recEnd < date) continue;
      } else if (ride.datetime.slice(0, 10) < date) {
        continue;
      }
      // Filtro de destino/origen textual
      if (query.origin && !ride.origin.toLowerCase().includes(query.origin.toLowerCase())) continue;
      if (query.dest && !ride.dest.toLowerCase().includes(query.dest.toLowerCase())) continue;

      const occs = this.occurrencesForRide(ride, date, toStr, bookingsByRide);
      const occ = occs.find((o) => o.availableSeats > 0);
      if (!occ) continue;
      if (query.seats && occ.availableSeats < Number(query.seats)) continue;

      const eco = ride.vehicle ? ECO_FUEL_TYPES.includes(ride.vehicle.fuelType as any) : false;
      if (query.eco === 'true' && !eco) continue;

      // Rating medio del conductor
      const rating = await this.driverRating(ride.driverId);
      if (query.minRating && Number(query.minRating) > 0 && rating < Number(query.minRating)) continue;

      results.push({
        ...occ,
        ride,
        driverName: ride.driver?.username ?? 'Conductor',
        driverRating: rating,
        vehicleEco: eco,
        distanceKm: this.routeInfo(ride).distanceKm,
      });
    }

    // Orden por proximidad al origen de la búsqueda (centro de Madrid por defecto)
    const searchLat = 40.4168;
    const searchLng = -3.7038;
    results.sort((a, b) => {
      const da = haversineKm(searchLat, searchLng, a.ride.originLat, a.ride.originLng);
      const db = haversineKm(searchLat, searchLng, b.ride.originLat, b.ride.originLng);
      return da - db;
    });
    return results.slice(0, 50);
  }

  private async driverRating(driverId: string): Promise<number> {
    const rows: Array<{ rating: number }> = await this.dataSource.query(
      'SELECT rating FROM reviews WHERE "targetId" = ?',
      [driverId],
    );
    if (!rows.length) return 0;
    const avg = rows.reduce((s, r) => s + Number(r.rating), 0) / rows.length;
    return Math.round(avg * 10) / 10;
  }

  async findMine(userId: string) {
    const rides = await this.ridesRepo.find({
      where: { driverId: userId },
      relations: { vehicle: true },
      order: { datetime: 'DESC' },
    });
    return rides.map((r) => ({ ...r, ...this.routeInfo(r) }));
  }

  async findOne(id: string) {
    const ride = await this.ridesRepo.findOne({
      where: { id },
      relations: { driver: true, vehicle: true },
    });
    if (!ride) throw new NotFoundException('Viaje no encontrado');
    return { ...ride, ...this.routeInfo(ride) };
  }

  async occurrences(id: string, from?: string, to?: string) {
    const ride = await this.ridesRepo.findOne({ where: { id } });
    if (!ride) throw new NotFoundException('Viaje no encontrado');
    const fromStr = from || toDateStr(new Date());
    const toStr = to || toDateStr(addDays(new Date(fromStr + 'T00:00:00'), 14));
    const bookingsByRide = await this.activeBookingsByRide([id]);
    return this.occurrencesForRide(ride, fromStr, toStr, bookingsByRide);
  }

  async update(userId: string, id: string, dto: UpdateRideDto) {
    const ride = await this.ridesRepo.findOne({ where: { id } });
    if (!ride) throw new NotFoundException('Viaje no encontrado');
    if (ride.driverId !== userId) throw new ForbiddenException('Solo el conductor puede editar');
    if (dto.price !== undefined) {
      if (dto.price < 0.5 || dto.price > 50) throw new BadRequestException('Precio fuera de rango');
      ride.price = dto.price;
    }
    if (dto.seats !== undefined) {
      if (dto.seats < 1) throw new BadRequestException('Plazas inválidas');
      ride.seats = dto.seats;
    }
    if (dto.notes !== undefined) ride.notes = dto.notes;
    const saved = await this.ridesRepo.save(ride);
    return { ...saved, ...this.routeInfo(saved) };
  }

  /**
   * Cancela un viaje (plantilla recurrente → ocurrencias futuras; puntual → el viaje).
   * Las reservas pending/confirmed de ocurrencias futuras pasan a cancelled.
   */
  async cancel(userId: string, id: string) {
    const ride = await this.ridesRepo.findOne({ where: { id } });
    if (!ride) throw new NotFoundException('Viaje no encontrado');
    if (ride.driverId !== userId) throw new ForbiddenException('Solo el conductor puede cancelar');
    if (ride.status === 'cancelled') return { cancelled: true };

    const hasCompleted = await this.bookingsRepo.count({
      where: { rideId: id, status: 'completed' },
    });
    if (hasCompleted > 0) {
      throw new BadRequestException('No puedes cancelar un viaje con reservas completadas');
    }

    const today = toDateStr(new Date());
    const futureBookings = await this.bookingsRepo.find({
      where: { rideId: id, status: 'pending' as const },
    });
    const futureConfirmed = await this.bookingsRepo.find({
      where: { rideId: id, status: 'confirmed' as const },
    });
    const affected = [...futureBookings, ...futureConfirmed].filter(
      (b) => b.occurrenceDate >= today,
    );
    for (const b of affected) {
      b.status = 'cancelled';
      b.cancelReason = 'Viaje cancelado por el conductor';
      await this.bookingsRepo.save(b);
    }

    ride.status = 'cancelled';
    await this.ridesRepo.save(ride);
    return { cancelled: true, bookingsCancelled: affected.length };
  }
}
