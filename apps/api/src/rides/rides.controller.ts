import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { RidesService } from './rides.service';
import { CreateRideDto, UpdateRideDto } from '../dto/dto';

@ApiTags('rides')
@Controller('rides')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RidesController {
  constructor(private readonly ridesService: RidesService) {}

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateRideDto) {
    return this.ridesService.create(userId, dto);
  }

  @Get()
  search(
    @Query('origin') origin?: string,
    @Query('dest') dest?: string,
    @Query('date') date?: string,
    @Query('seats') seats?: string,
    @Query('eco') eco?: string,
    @Query('minRating') minRating?: string,
  ) {
    return this.ridesService.search({ origin, dest, date, seats, eco, minRating });
  }

  @Get('mine')
  findMine(@CurrentUser('id') userId: string) {
    return this.ridesService.findMine(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ridesService.findOne(id);
  }

  @Get(':id/occurrences')
  occurrences(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.ridesService.occurrences(id, from, to);
  }

  @Patch(':id')
  update(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: UpdateRideDto) {
    return this.ridesService.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  cancel(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.ridesService.cancel(userId, id);
  }
}
