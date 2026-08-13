import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking, Ride, Vehicle } from '../entities/entities';
import { AuthModule } from '../auth/auth.module';
import { RidesController } from './rides.controller';
import { RidesService } from './rides.service';

@Module({
  imports: [TypeOrmModule.forFeature([Ride, Booking, Vehicle]), AuthModule],
  controllers: [RidesController],
  providers: [RidesService],
  exports: [RidesService],
})
export class RidesModule {}
