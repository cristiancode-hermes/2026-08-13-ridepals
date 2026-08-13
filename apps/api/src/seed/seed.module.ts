import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Booking,
  FavoriteRoute,
  Message,
  Review,
  Ride,
  User,
  Vehicle,
} from '../entities/entities';
import { SeedService } from './seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Vehicle, Ride, Booking, Review, FavoriteRoute, Message])],
  providers: [SeedService],
})
export class SeedModule {}
