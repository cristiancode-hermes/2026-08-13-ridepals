import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking, Message, Ride } from '../entities/entities';
import { CreateMessageDto } from '../dto/dto';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message) private readonly messagesRepo: Repository<Message>,
    @InjectRepository(Booking) private readonly bookingsRepo: Repository<Booking>,
    @InjectRepository(Ride) private readonly ridesRepo: Repository<Ride>,
  ) {}

  /** Verifica que el usuario participa en el hilo (conductor o pasajero de la reserva). */
  private async assertParticipant(userId: string, rideId: string, bookingId: string) {
    const booking = await this.bookingsRepo.findOne({
      where: { id: bookingId, rideId },
      relations: { ride: true },
    });
    if (!booking) throw new NotFoundException('Reserva no encontrada');
    const isPassenger = booking.passengerId === userId;
    const isDriver = booking.ride.driverId === userId;
    if (!isPassenger && !isDriver) {
      throw new ForbiddenException('No participas en este hilo');
    }
  }

  async findByRide(userId: string, rideId: string) {
    const ride = await this.ridesRepo.findOne({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Viaje no encontrado');
    // El conductor ve todos los hilos de sus viajes; un pasajero solo el suyo
    if (ride.driverId !== userId) {
      const bookings = await this.bookingsRepo.find({ where: { rideId, passengerId: userId } });
      const ids = bookings.map((b) => b.id);
      if (ids.length === 0) throw new ForbiddenException('No participas en este viaje');
      return this.messagesRepo.find({
        where: ids.map((bookingId) => ({ rideId, bookingId })),
        relations: { sender: true },
        order: { createdAt: 'ASC' },
      });
    }
    return this.messagesRepo.find({
      where: { rideId },
      relations: { sender: true },
      order: { createdAt: 'ASC' },
    });
  }

  async create(userId: string, dto: CreateMessageDto) {
    await this.assertParticipant(userId, dto.rideId, dto.bookingId);
    const body = dto.body.trim();
    if (!body) throw new BadRequestException('El mensaje no puede estar vacío');
    if (body.length > 1000) throw new BadRequestException('Máximo 1000 caracteres');
    const message = (await this.messagesRepo.save(
      this.messagesRepo.create({
        rideId: dto.rideId,
        bookingId: dto.bookingId,
        senderId: userId,
        body,
      } as any),
    )) as unknown as Message;
    return message;
  }
}
