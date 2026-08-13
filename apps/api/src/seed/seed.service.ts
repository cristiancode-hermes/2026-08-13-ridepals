import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import {
  Booking,
  FavoriteRoute,
  Message,
  Review,
  Ride,
  User,
  Vehicle,
} from '../entities/entities';
import { addDays, toDateStr } from '../common/geo';

/**
 * Seed idempotente: crea datos de demostración (usuarios, vehículos, viajes,
 * reservas, reseñas, favoritos y mensajes) solo si la BD está vacía.
 * La cuenta demo permite ver la app con datos sin registrarse.
 */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Vehicle) private readonly vehiclesRepo: Repository<Vehicle>,
    @InjectRepository(Ride) private readonly ridesRepo: Repository<Ride>,
    @InjectRepository(Booking) private readonly bookingsRepo: Repository<Booking>,
    @InjectRepository(Review) private readonly reviewsRepo: Repository<Review>,
    @InjectRepository(FavoriteRoute) private readonly favoritesRepo: Repository<FavoriteRoute>,
    @InjectRepository(Message) private readonly messagesRepo: Repository<Message>,
  ) {}

  async onApplicationBootstrap() {
    if ((await this.usersRepo.count()) > 0) {
      this.logger.log('Seed omitido: la base de datos ya contiene datos.');
      return;
    }

    const hash = await bcrypt.hash('demo1234', 10);

    // ── Usuarios ────────────────────────────────────────────────
    const demo = (await this.usersRepo.save(
      this.usersRepo.create({
        username: 'demo',
        email: 'demo@ridepals.dev',
        passwordHash: hash,
        bio: 'Conductor demo de RidePals: Madrid ↔ Guadalajara varias veces por semana.',
      } as any),
    )) as unknown as User;

    const lucia = (await this.usersRepo.save(
      this.usersRepo.create({
        username: 'lucia',
        email: 'lucia@example.com',
        passwordHash: hash,
        bio: 'Diseñadora, siempre viajando entre Madrid y Toledo.',
      } as any),
    )) as unknown as User;

    const marc = (await this.usersRepo.save(
      this.usersRepo.create({
        username: 'marc',
        email: 'marc@example.com',
        passwordHash: hash,
        bio: 'Estudiante de ingeniería. Comparto trayecto al campus todos los días.',
      } as any),
    )) as unknown as User;

    // ── Vehículos ───────────────────────────────────────────────
    const seat = (await this.vehiclesRepo.save(
      this.vehiclesRepo.create({
        ownerId: demo.id,
        brand: 'Seat',
        model: 'Leon',
        plate: '1234ABC',
        seats: 5,
        fuelType: 'hibrido',
      } as any),
    )) as unknown as Vehicle;

    await this.vehiclesRepo.save(
      this.vehiclesRepo.create({
        ownerId: lucia.id,
        brand: 'Toyota',
        model: 'Corolla',
        plate: '5678DEF',
        seats: 4,
        fuelType: 'electrico',
      } as any),
    );

    // ── Viajes ──────────────────────────────────────────────────
    const madridGua = (await this.ridesRepo.save(
      this.ridesRepo.create({
        driverId: demo.id,
        vehicleId: seat.id,
        origin: 'Madrid (Atocha)',
        dest: 'Guadalajara (Centro)',
        originLat: 40.4055,
        originLng: -3.6905,
        destLat: 40.6322,
        destLng: -3.1615,
        datetime: addDays(new Date(), 1).toISOString(),
        seats: 4,
        price: 6,
        recurrence: null,
        status: 'active',
        notes: 'Salgo de la estación, parada en La Arboleda si alguien lo necesita.',
      } as any),
    )) as unknown as Ride;

    // Viaje recurrente laborable (Madrid → Campus UAH, lunes a viernes)
    const recurrente = (await this.ridesRepo.save(
      this.ridesRepo.create({
        driverId: demo.id,
        vehicleId: seat.id,
        origin: 'Madrid (Atocha)',
        dest: 'Alcalá de Henares (UAH)',
        originLat: 40.4055,
        originLng: -3.6905,
        destLat: 40.4822,
        destLng: -3.3597,
        datetime: addDays(new Date(), 2).toISOString(),
        seats: 3,
        price: 4,
        recurrence: { weekdays: [1, 2, 3, 4, 5], time: '08:00', endDate: addDays(new Date(), 60).toISOString().slice(0, 10) },
        status: 'active',
        notes: 'Campus universitario. Ideal para estudiantes y profesores.',
      } as any),
    )) as unknown as Ride;

    // Viaje completado (para stats y reseñas)
    const pasado = (await this.ridesRepo.save(
      this.ridesRepo.create({
        driverId: lucia.id,
        vehicleId: (await this.vehiclesRepo.find({ where: { ownerId: lucia.id } }))[0].id,
        origin: 'Madrid (Chamartín)',
        dest: 'Toledo (Puerta Bisagra)',
        originLat: 40.4722,
        originLng: -3.6825,
        destLat: 39.858,
        destLng: -4.0244,
        datetime: addDays(new Date(), -3).toISOString(),
        seats: 3,
        price: 8,
        recurrence: null,
        status: 'active',
        notes: null,
      } as any),
    )) as unknown as Ride;

    // ── Reservas ────────────────────────────────────────────────
    const booking1 = (await this.bookingsRepo.save(
      this.bookingsRepo.create({
        rideId: madridGua.id,
        passengerId: marc.id,
        occurrenceDate: toDateStr(addDays(new Date(), 1)),
        seats: 1,
        status: 'confirmed',
        cancelReason: null,
      } as any),
    )) as unknown as Booking;

    const booking2 = (await this.bookingsRepo.save(
      this.bookingsRepo.create({
        rideId: recurrente.id,
        passengerId: lucia.id,
        occurrenceDate: toDateStr(addDays(new Date(), 2)),
        seats: 1,
        status: 'pending',
        cancelReason: null,
      } as any),
    )) as unknown as Booking;

    // Viaje pasado completado: Marc viajó con Lucía → reseñas cruzadas
    const booking3 = (await this.bookingsRepo.save(
      this.bookingsRepo.create({
        rideId: pasado.id,
        passengerId: marc.id,
        occurrenceDate: toDateStr(addDays(new Date(), -3)),
        seats: 1,
        status: 'completed',
        cancelReason: null,
      } as any),
    )) as unknown as Booking;

    // ── Reseñas (cruzadas tras viaje completado) ────────────────
    await this.reviewsRepo.save(
      this.reviewsRepo.create({
        bookingId: booking3.id,
        authorId: marc.id,
        targetId: lucia.id,
        rating: 5,
        comment: 'Conducción impecable y muy puntual. ¡Repetiremos!',
      } as any),
    );
    await this.reviewsRepo.save(
      this.reviewsRepo.create({
        bookingId: booking3.id,
        authorId: lucia.id,
        targetId: marc.id,
        rating: 5,
        comment: 'Pasajero de 10, charla agradable y puntualidad total.',
      } as any),
    );

    // ── Favoritos y mensajes ────────────────────────────────────
    await this.favoritesRepo.save(
      this.favoritesRepo.create({
        userId: demo.id,
        origin: 'Madrid (Atocha)',
        dest: 'Guadalajara (Centro)',
      } as any),
    );
    await this.messagesRepo.save(
      this.messagesRepo.create({
        rideId: madridGua.id,
        bookingId: booking1.id,
        senderId: marc.id,
        body: 'Hola, ¿puedo llevar una maleta mediana?',
      } as any),
    );
    await this.messagesRepo.save(
      this.messagesRepo.create({
        rideId: madridGua.id,
        bookingId: booking1.id,
        senderId: demo.id,
        body: 'Sí, sin problema. Queda espacio en el maletero.',
      } as any),
    );

    this.logger.log(
      `Seed completado: demo@ridepals.dev / demo1234 · ${await this.ridesRepo.count()} viajes, ${await this.bookingsRepo.count()} reservas`,
    );
  }
}
