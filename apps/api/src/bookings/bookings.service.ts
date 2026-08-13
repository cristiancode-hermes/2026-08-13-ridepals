import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Booking, Ride, User } from '../entities/entities';
import { toDateStr } from '../common/geo';
import { BookingStatusDto, CancelBookingDto, CreateBookingDto } from '../dto/dto';
import { canTransition, OCCUPYING } from './booking-state';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking) private readonly bookingsRepo: Repository<Booking>,
    @InjectRepository(Ride) private readonly ridesRepo: Repository<Ride>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Mutex en proceso: serializa la reserva atómica. better-sqlite3 (conexión única
   * síncrona) no soporta transacciones solapadas de TypeORM; con un lock por
   * promesa las reservas concurrentes se encolan y la capacidad se re-chequea
   * una a una (la 2ª recibe 409 "Ya no quedan plazas"). En Neon/Postgres se
   * usa `SELECT ... FOR UPDATE` (ver ARCHITECTURE.md).
   */
  private lock: Promise<unknown> = Promise.resolve();

  private withLock<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.lock.then(fn, fn);
    this.lock = run.catch(() => undefined);
    return run;
  }

  /**
   * Reserva atómica: re-chequea la capacidad DENTRO de una transacción.
   * En SQLite (better-sqlite3, síncrono, conexión única) la transacción serializa
   * las reservas concurrentes; en Neon se usaría `SELECT ... FOR UPDATE` (ver docs).
   */
  async create(userId: string, dto: CreateBookingDto) {
    const ride = await this.ridesRepo.findOne({
      where: { id: dto.rideId, status: 'active' },
    });
    if (!ride) throw new NotFoundException('Viaje no encontrado');
    if (ride.driverId === userId) {
      throw new BadRequestException('No puedes reservar tu propio viaje');
    }
    if (dto.seats < 1) throw new BadRequestException('Asientos inválidos');

    return this.withLock(() =>
      this.dataSource.transaction(async (em) => {
        const bookingRepo = em.getRepository(Booking);
        const rideRepo = em.getRepository(Ride);

        const freshRide = await rideRepo.findOne({ where: { id: dto.rideId } });
        if (!freshRide || freshRide.status !== 'active') {
          throw new NotFoundException('Viaje no encontrado');
        }

        // Duplicado: misma (ride, fecha, pasajero)
        const dup = await bookingRepo.findOne({
          where: {
            rideId: dto.rideId,
            occurrenceDate: dto.occurrenceDate,
            passengerId: userId,
          },
        });
        if (dup) throw new ConflictException('Ya tienes una reserva en este viaje');

        // Capacidad: suma de asientos ocupados (pending + confirmed)
        const occupied = await bookingRepo
          .createQueryBuilder('b')
          .select('COALESCE(SUM(b.seats), 0)', 'total')
          .where('b.rideId = :rideId', { rideId: dto.rideId })
          .andWhere('b.occurrenceDate = :date', { date: dto.occurrenceDate })
          .andWhere('b.status IN (:...statuses)', { statuses: OCCUPYING })
          .getRawOne<{ total: number | string }>();
        const booked = Number(occupied?.total ?? 0);
        if (booked + dto.seats > freshRide.seats) {
          throw new ConflictException('Ya no quedan plazas');
        }

        const booking = (await bookingRepo.save(
          bookingRepo.create({
            rideId: dto.rideId,
            passengerId: userId,
            occurrenceDate: dto.occurrenceDate,
            seats: dto.seats,
            status: 'pending',
            cancelReason: null,
          } as any),
        )) as unknown as Booking;
        return booking;
      }),
    );
  }

  /** Mis reservas como pasajero, con ride + conductor. */
  async findMine(userId: string) {
    return this.bookingsRepo.find({
      where: { passengerId: userId },
      relations: { ride: { driver: true, vehicle: true } },
      order: { createdAt: 'DESC' },
    });
  }

  /** Reservas de los viajes del usuario como conductor. */
  async findAsDriver(userId: string) {
    const rides = await this.ridesRepo.find({
      where: { driverId: userId },
      relations: { bookings: { passenger: true } },
    });
    const out: Array<Booking & { ride: Ride }> = [];
    for (const r of rides) {
      for (const b of r.bookings ?? []) {
        out.push({ ...b, ride: r });
      }
    }
    out.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
    return out;
  }

  async findOne(userId: string, id: string) {
    const booking = await this.bookingsRepo.findOne({
      where: { id },
      relations: { ride: { driver: true, vehicle: true }, passenger: true },
    });
    if (!booking) throw new NotFoundException('Reserva no encontrada');
    const isPassenger = booking.passengerId === userId;
    const isDriver = booking.ride.driverId === userId;
    if (!isPassenger && !isDriver) {
      throw new ForbiddenException('No tienes acceso a esta reserva');
    }
    return booking;
  }

  /** Conductor confirma o rechaza una reserva pending. */
  async setStatus(userId: string, id: string, dto: BookingStatusDto) {
    const booking = await this.bookingsRepo.findOne({
      where: { id },
      relations: { ride: true },
    });
    if (!booking) throw new NotFoundException('Reserva no encontrada');
    if (booking.ride.driverId !== userId) {
      throw new ForbiddenException('Solo el conductor puede confirmar o rechazar');
    }
    if (booking.ride.status === 'cancelled') {
      throw new BadRequestException('El viaje está cancelado');
    }
    if (!canTransition(booking.status, dto.status)) {
      throw new BadRequestException(
        `No se puede pasar de ${booking.status} a ${dto.status}`,
      );
    }
    booking.status = dto.status;
    if (dto.status === 'rejected') booking.cancelReason = dto.reason ?? 'Rechazada por el conductor';
    return this.bookingsRepo.save(booking);
  }

  /** Pasajero cancela una reserva pending|confirmed. */
  async cancel(userId: string, id: string, dto: CancelBookingDto) {
    const booking = await this.bookingsRepo.findOne({
      where: { id },
      relations: { ride: true },
    });
    if (!booking) throw new NotFoundException('Reserva no encontrada');
    if (booking.passengerId !== userId) {
      throw new ForbiddenException('Solo el pasajero puede cancelar su reserva');
    }
    if (!canTransition(booking.status, 'cancelled')) {
      throw new BadRequestException('Esta reserva ya está cerrada');
    }
    if (booking.status === 'completed') {
      throw new BadRequestException('No puedes cancelar un viaje completado');
    }
    booking.status = 'cancelled';
    booking.cancelReason = dto.reason ?? 'Cancelada por el pasajero';
    return this.bookingsRepo.save(booking);
  }

  /**
   * Conductor marca una ocurrencia como completada: todas las reservas confirmed
   * de esa fecha pasan a completed (habilita reseñas cruzadas).
   */
  async completeOccurrence(userId: string, rideId: string, occurrenceDate: string) {
    const ride = await this.ridesRepo.findOne({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Viaje no encontrado');
    if (ride.driverId !== userId) {
      throw new ForbiddenException('Solo el conductor puede completar el viaje');
    }
    const today = toDateStr(new Date());
    if (occurrenceDate > today) {
      throw new BadRequestException('No puedes completar un viaje futuro');
    }
    const confirmed = await this.bookingsRepo.find({
      where: { rideId, occurrenceDate, status: 'confirmed' as const },
    });
    for (const b of confirmed) {
      b.status = 'completed';
      await this.bookingsRepo.save(b);
    }
    return { completed: confirmed.length };
  }

  async getParticipant(booking: Booking): Promise<User | null> {
    const full = await this.bookingsRepo.findOne({
      where: { id: booking.id },
      relations: { ride: true },
    });
    if (!full) return null;
    const driver = await this.dataSource.getRepository(User).findOne({
      where: { id: full.ride.driverId },
    });
    return driver;
  }
}
