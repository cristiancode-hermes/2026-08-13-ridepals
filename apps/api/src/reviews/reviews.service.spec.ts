import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Review, Booking, Ride, User } from '../entities/entities';
import { ReviewsService } from './reviews.service';
import { toDateStr, addDays } from '../common/geo';

function makeBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: 'b1',
    rideId: 'r1',
    passengerId: 'u-pax',
    occurrenceDate: toDateStr(addDays(new Date(), -1)),
    seats: 1,
    status: 'completed',
    cancelReason: null,
    createdAt: new Date(),
    ride: { id: 'r1', driverId: 'u-driver' } as Ride,
    passenger: { id: 'u-pax' } as User,
    ...overrides,
  } as Booking;
}

function reviewsRepoMock(existing: Review[] = []) {
  return {
    findOne: jest.fn(async ({ where }: any) =>
      existing.find((r) => r.bookingId === where.bookingId && r.authorId === where.authorId) ?? null,
    ),
    create: jest.fn((e: any) => e),
    save: jest.fn(async (e: any) => e),
    find: jest.fn(async () => existing),
  };
}

describe('ReviewsService — reglas de valoración', () => {
  it('solo se puede valorar una reserva completada → 403 si no', async () => {
    const bookingsRepo = { findOne: jest.fn(async () => makeBooking({ status: 'confirmed' })) };
    const service = new ReviewsService(reviewsRepoMock() as any, bookingsRepo as any);
    await expect(
      service.create('u-pax', { bookingId: 'b1', rating: 5 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('el pasajero valora al conductor tras el viaje → review con targetId = conductor', async () => {
    const bookingsRepo = { findOne: jest.fn(async () => makeBooking()) };
    const service = new ReviewsService(reviewsRepoMock() as any, bookingsRepo as any);
    const review = await service.create('u-pax', { bookingId: 'b1', rating: 5, comment: 'Genial' });
    expect(review.targetId).toBe('u-driver');
    expect(review.authorId).toBe('u-pax');
    expect(review.rating).toBe(5);
  });

  it('no se puede valorar dos veces la misma reserva → 409', async () => {
    const existing = [{ id: 'rev1', bookingId: 'b1', authorId: 'u-pax', targetId: 'u-driver', rating: 5 } as Review];
    const bookingsRepo = { findOne: jest.fn(async () => makeBooking()) };
    const service = new ReviewsService(reviewsRepoMock(existing) as any, bookingsRepo as any);
    await expect(
      service.create('u-pax', { bookingId: 'b1', rating: 4 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('el conductor valora al pasajero (targetId = pasajero)', async () => {
    const bookingsRepo = { findOne: jest.fn(async () => makeBooking()) };
    const service = new ReviewsService(reviewsRepoMock() as any, bookingsRepo as any);
    const review = await service.create('u-driver', { bookingId: 'b1', rating: 4, comment: 'Puntual' });
    expect(review.targetId).toBe('u-pax');
  });

  it('quien no participa en la reserva no puede valorar → 403', async () => {
    const bookingsRepo = { findOne: jest.fn(async () => makeBooking()) };
    const service = new ReviewsService(reviewsRepoMock() as any, bookingsRepo as any);
    await expect(
      service.create('u-extraño', { bookingId: 'b1', rating: 5 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
