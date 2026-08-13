import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking, Review } from '../entities/entities';
import { CreateReviewDto } from '../dto/dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review) private readonly reviewsRepo: Repository<Review>,
    @InjectRepository(Booking) private readonly bookingsRepo: Repository<Booking>,
  ) {}

  /**
   * Reseña cruzada tras viaje completado:
   * - solo bookings completados
   * - 1 reseña por (booking, autor) — el conductor valora al pasajero y viceversa
   * - no se puede reseñar a uno mismo
   */
  async create(userId: string, dto: CreateReviewDto) {
    const booking = await this.bookingsRepo.findOne({
      where: { id: dto.bookingId },
      relations: { ride: true, passenger: true },
    });
    if (!booking) throw new NotFoundException('Reserva no encontrada');

    const isPassenger = booking.passengerId === userId;
    const isDriver = booking.ride.driverId === userId;
    if (!isPassenger && !isDriver) {
      throw new ForbiddenException('No participas en esta reserva');
    }
    if (booking.status !== 'completed') {
      throw new ForbiddenException('El viaje aún no se ha completado');
    }

    const targetId = isPassenger ? booking.ride.driverId : booking.passengerId;
    if (targetId === userId) {
      throw new BadRequestException('No puedes reseñarte a ti mismo');
    }

    const dup = await this.reviewsRepo.findOne({
      where: { bookingId: dto.bookingId, authorId: userId },
    });
    if (dup) throw new ConflictException('Ya has valorado este viaje');

    if (dto.comment && (dto.comment.length < 1 || dto.comment.length > 500)) {
      throw new BadRequestException('El comentario debe tener entre 1 y 500 caracteres');
    }

    const review = (await this.reviewsRepo.save(
      this.reviewsRepo.create({
        bookingId: dto.bookingId,
        authorId: userId,
        targetId,
        rating: dto.rating,
        comment: dto.comment ?? null,
      } as any),
    )) as unknown as Review;
    return review;
  }

  async byRide(rideId: string) {
    const bookings = await this.bookingsRepo.find({ where: { rideId } });
    const ids = bookings.map((b) => b.id);
    if (ids.length === 0) return [];
    return this.reviewsRepo.find({
      where: ids.map((bookingId) => ({ bookingId })),
      order: { createdAt: 'DESC' },
    });
  }
}
