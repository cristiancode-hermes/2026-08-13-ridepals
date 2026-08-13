import { Controller, Get, NotFoundException, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking, Review, Ride, User } from '../entities/entities';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { haversineKm } from '../common/geo';
import { CO2_PER_KM } from '../common/types';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Ride) private readonly ridesRepo: Repository<Ride>,
    @InjectRepository(Booking) private readonly bookingsRepo: Repository<Booking>,
    @InjectRepository(Review) private readonly reviewsRepo: Repository<Review>,
  ) {}

  @Get(':id')
  async getPublic(@Param('id') id: string) {
    const user = await this.usersRepo.findOne({
      where: { id },
      relations: { vehicles: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    const vehicleCount = user.vehicles?.length ?? 0;
    const { passwordHash, ...safe } = user;
    return { ...safe, vehicleCount };
  }

  @Get(':id/reviews')
  async getReviews(@Param('id') id: string) {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return this.reviewsRepo.find({
      where: { targetId: id },
      relations: { booking: true },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  @Get(':id/stats')
  async getStats(@Param('id') id: string) {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const ridesGiven = await this.ridesRepo.count({ where: { driverId: id } });
    const ridesTaken = await this.bookingsRepo.count({
      where: { passengerId: id, status: 'completed' },
    });

    // km/CO₂/€ ahorrados como pasajero: reservas completadas
    const completed = await this.bookingsRepo.find({
      where: { passengerId: id, status: 'completed' },
      relations: { ride: true },
    });
    let kmSaved = 0;
    let moneySaved = 0;
    for (const b of completed) {
      const km = haversineKm(
        b.ride.originLat,
        b.ride.originLng,
        b.ride.destLat,
        b.ride.destLng,
      );
      kmSaved += km;
      moneySaved += b.seats * b.ride.price;
    }
    const co2SavedKg = kmSaved * CO2_PER_KM;

    const reviews = await this.reviewsRepo.find({ where: { targetId: id } });
    const avgRating =
      reviews.length > 0
        ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
        : 0;

    return {
      ridesGiven,
      ridesTaken,
      kmSaved: Math.round(kmSaved * 100) / 100,
      co2SavedKg: Math.round(co2SavedKg * 10) / 10,
      moneySaved: Math.round(moneySaved * 100) / 100,
      avgRating,
      reviewCount: reviews.length,
    };
  }
}
