import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking, Review, Ride, User } from '../entities/entities';
import { AuthModule } from '../auth/auth.module';
import { UsersController } from './users.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Ride, Booking, Review]),
    AuthModule,
  ],
  controllers: [UsersController],
})
export class UsersModule {}
