import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { BookingsService } from './bookings.service';
import { BookingStatusDto, CancelBookingDto, CreateBookingDto } from '../dto/dto';

@ApiTags('bookings')
@Controller('bookings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateBookingDto) {
    return this.bookingsService.create(userId, dto);
  }

  @Get('mine')
  findMine(@CurrentUser('id') userId: string) {
    return this.bookingsService.findMine(userId);
  }

  @Get('as-driver')
  findAsDriver(@CurrentUser('id') userId: string) {
    return this.bookingsService.findAsDriver(userId);
  }

  @Get(':id')
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.bookingsService.findOne(userId, id);
  }

  @Patch(':id/status')
  setStatus(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: BookingStatusDto) {
    return this.bookingsService.setStatus(userId, id, dto);
  }

  @Patch(':id/cancel')
  cancel(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: CancelBookingDto) {
    return this.bookingsService.cancel(userId, id, dto);
  }

  @Post('complete')
  completeOccurrence(
    @CurrentUser('id') userId: string,
    @Body() dto: { rideId: string; occurrenceDate: string },
  ) {
    return this.bookingsService.completeOccurrence(userId, dto.rideId, dto.occurrenceDate);
  }
}
