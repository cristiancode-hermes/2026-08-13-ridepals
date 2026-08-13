import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from '../dto/dto';

@ApiTags('messages')
@Controller('messages')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get(':rideId')
  findByRide(@CurrentUser('id') userId: string, @Param('rideId') rideId: string) {
    return this.messagesService.findByRide(userId, rideId);
  }

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateMessageDto) {
    return this.messagesService.create(userId, dto);
  }
}
