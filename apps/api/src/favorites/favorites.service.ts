import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FavoriteRoute } from '../entities/entities';
import { CreateFavoriteDto } from '../dto/dto';

const MAX_FAVORITES = 10;

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(FavoriteRoute)
    private readonly favoritesRepo: Repository<FavoriteRoute>,
  ) {}

  async create(userId: string, dto: CreateFavoriteDto) {
    const count = await this.favoritesRepo.count({ where: { userId } });
    if (count >= MAX_FAVORITES) {
      throw new BadRequestException('Límite de rutas favoritas alcanzado');
    }
    const origin = dto.origin.trim();
    const dest = dto.dest.trim();
    const dup = await this.favoritesRepo.findOne({ where: { userId, origin, dest } });
    if (dup) throw new ConflictException('Ya tienes esta ruta guardada');
    const fav = (await this.favoritesRepo.save(
      this.favoritesRepo.create({ userId, origin, dest } as any),
    )) as unknown as FavoriteRoute;
    return fav;
  }

  async findAll(userId: string) {
    return this.favoritesRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async remove(userId: string, id: string) {
    const fav = await this.favoritesRepo.findOne({ where: { id, userId } });
    if (!fav) throw new NotFoundException('Ruta favorita no encontrada');
    await this.favoritesRepo.remove(fav);
    return { deleted: true };
  }
}
