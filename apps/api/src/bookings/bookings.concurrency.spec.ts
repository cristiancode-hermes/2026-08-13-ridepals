import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Booking, Ride, User, Vehicle } from '../entities/entities';
import { BookingsService } from './bookings.service';
import { toDateStr, addDays } from '../common/geo';

/**
 * Tests de concurrencia con better-sqlite3 real (en memoria).
 * El driver síncrono serializa las escrituras; la reserva atómica
 * (transacción + re-chequeo de capacidad) debe dejar pasar exactamente
 * tantas reservas como plazas haya.
 */
describe('BookingsService — concurrencia (integración better-sqlite3)', () => {
  let ds: DataSource;
  let service: BookingsService;
  let driver: User;
  let passengers: User[];
  let ride: Ride;

  beforeAll(async () => {
    ds = new DataSource({
      type: 'better-sqlite3',
      database: ':memory:',
      entities: [User, Vehicle, Ride, Booking],
      synchronize: true,
    });
    await ds.initialize();

    const usersRepo = ds.getRepository(User);
    driver = (await usersRepo.save(usersRepo.create({ username: 'driver', email: 'driver@x.com', passwordHash: 'h' } as any))) as unknown as User;
    passengers = [];
    for (let i = 0; i < 4; i++) {
      passengers.push(
        (await usersRepo.save(usersRepo.create({ username: `pax${i}`, email: `pax${i}@x.com`, passwordHash: 'h' } as any))) as unknown as User,
      );
    }

    const vehiclesRepo = ds.getRepository(Vehicle);
    const vehicle = (await vehiclesRepo.save(
      vehiclesRepo.create({ ownerId: driver.id, brand: 'Seat', model: 'Leon', plate: `V${Math.random().toString(36).slice(2, 6).toUpperCase()}`, seats: 4, fuelType: 'hibrido' } as any),
    )) as unknown as Vehicle;

    const ridesRepo = ds.getRepository(Ride);
    ride = (await ridesRepo.save(
      ridesRepo.create({
        driverId: driver.id,
        vehicleId: vehicle.id,
        origin: 'Madrid',
        dest: 'Guadalajara',
        originLat: 40.4,
        originLng: -3.7,
        destLat: 40.63,
        destLng: -3.16,
        datetime: addDays(new Date(), 2).toISOString(),
        seats: 1, // ← UNA plaza para forzar la carrera
        price: 6,
        recurrence: null,
        status: 'active',
      } as any),
    )) as unknown as Ride;

    service = new BookingsService(ds.getRepository(Booking), ds.getRepository(Ride), ds);
  });

  afterAll(async () => {
    await ds.destroy();
  });

  it('3 pasajeros compiten por 1 plaza → exactamente 1 reserva creada, 2 reciben 409', async () => {
    const date = toDateStr(addDays(new Date(), 2));
    const results = await Promise.allSettled(
      passengers.slice(0, 3).map((p) =>
        service.create(p.id, { rideId: ride.id, occurrenceDate: date, seats: 1 }),
      ),
    );

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter(
      (r) => r.status === 'rejected' && (r.reason as Error).message.includes('Ya no quedan plazas'),
    );

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(2);

    const count = await ds.getRepository(Booking).count();
    expect(count).toBe(1);
  });

  it('el mismo pasajero no puede reservar dos veces el mismo (ride, fecha) → 409', async () => {
    const pax = passengers[3];
    const date = toDateStr(addDays(new Date(), 3));
    const ridesRepo = ds.getRepository(Ride);
    const extra = (await ridesRepo.save(
      ridesRepo.create({
        driverId: driver.id,
        vehicleId: (await ds.getRepository(Vehicle).findOneBy({ ownerId: driver.id }))!.id,
        origin: 'A',
        dest: 'B',
        originLat: 40.4,
        originLng: -3.7,
        destLat: 40.63,
        destLng: -3.16,
        datetime: addDays(new Date(), 3).toISOString(),
        seats: 3,
        price: 5,
        recurrence: null,
        status: 'active',
      } as any),
    )) as unknown as Ride;

    await service.create(pax.id, { rideId: extra.id, occurrenceDate: date, seats: 1 });
    await expect(
      service.create(pax.id, { rideId: extra.id, occurrenceDate: date, seats: 1 }),
    ).rejects.toThrow('Ya tienes una reserva en este viaje');
  });

  it('no se puede reservar el propio viaje → 400', async () => {
    const ridesRepo = ds.getRepository(Ride);
    const own = (await ridesRepo.save(
      ridesRepo.create({
        driverId: driver.id,
        vehicleId: (await ds.getRepository(Vehicle).findOneBy({ ownerId: driver.id }))!.id,
        origin: 'C',
        dest: 'D',
        originLat: 40.4,
        originLng: -3.7,
        destLat: 40.63,
        destLng: -3.16,
        datetime: addDays(new Date(), 4).toISOString(),
        seats: 3,
        price: 5,
        recurrence: null,
        status: 'active',
      } as any),
    )) as unknown as Ride;
    await expect(
      service.create(driver.id, { rideId: own.id, occurrenceDate: toDateStr(addDays(new Date(), 4)), seats: 1 }),
    ).rejects.toThrow('No puedes reservar tu propio viaje');
  });

  it('reservar en un viaje inexistente → 404', async () => {
    await expect(
      service.create(passengers[0].id, { rideId: 'no-existe', occurrenceDate: '2026-09-01', seats: 1 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('completar una ocurrencia pasa las reservas confirmed → completed (habilita reseñas)', async () => {
    const ridesRepo = ds.getRepository(Ride);
    const bookingsRepo = ds.getRepository(Booking);
    const v = (await ds.getRepository(Vehicle).findOneBy({ ownerId: driver.id }))!;
    const r = (await ridesRepo.save(
      ridesRepo.create({
        driverId: driver.id,
        vehicleId: v.id,
        origin: 'E',
        dest: 'F',
        originLat: 40.4,
        originLng: -3.7,
        destLat: 40.63,
        destLng: -3.16,
        datetime: addDays(new Date(), -2).toISOString(), // pasado
        seats: 3,
        price: 5,
        recurrence: null,
        status: 'active',
      } as any),
    )) as unknown as Ride;
    const date = toDateStr(addDays(new Date(), -2));
    const b = await service.create(passengers[0].id, { rideId: r.id, occurrenceDate: date, seats: 1 });
    await bookingsRepo.update(b.id, { status: 'confirmed' as const });

    const res = await service.completeOccurrence(driver.id, r.id, date);
    expect(res.completed).toBe(1);
    const after = await bookingsRepo.findOneBy({ id: b.id });
    expect(after?.status).toBe('completed');
  });
});
