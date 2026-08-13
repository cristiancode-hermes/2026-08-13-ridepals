import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ride, Vehicle } from '../entities/entities';
import { FUEL_TYPES } from '../common/types';
import { CreateVehicleDto, UpdateVehicleDto } from '../dto/dto';

const MAX_VEHICLES = 4;

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle) private readonly vehiclesRepo: Repository<Vehicle>,
    @InjectRepository(Ride) private readonly ridesRepo: Repository<Ride>,
  ) {}

  async create(userId: string, dto: CreateVehicleDto) {
    const count = await this.vehiclesRepo.count({ where: { ownerId: userId } });
    if (count >= MAX_VEHICLES) {
      throw new BadRequestException(`Máximo ${MAX_VEHICLES} vehículos por usuario`);
    }
    if (!/^[0-9]{4}[A-Z]{3}$/.test(dto.plate)) {
      throw new BadRequestException('Matrícula inválida (formato 1234ABC)');
    }
    if (dto.seats < 1 || dto.seats > 8) {
      throw new BadRequestException('Las plazas deben estar entre 1 y 8');
    }
    if (!FUEL_TYPES.includes(dto.fuelType as (typeof FUEL_TYPES)[number])) {
      throw new BadRequestException('Combustible inválido');
    }
    const plate = dto.plate.toUpperCase();
    const dup = await this.vehiclesRepo.findOne({ where: { plate } });
    if (dup) {
      throw new ConflictException('Ya existe un vehículo con esa matrícula');
    }
    return this.vehiclesRepo.save(
      this.vehiclesRepo.create({ ownerId: userId, ...dto, plate } as any),
    ) as unknown as Vehicle;
  }

  async findAll(userId: string) {
    return this.vehiclesRepo.find({ where: { ownerId: userId }, order: { brand: 'ASC' } });
  }

  async update(userId: string, id: string, dto: UpdateVehicleDto) {
    const vehicle = await this.vehiclesRepo.findOne({ where: { id, ownerId: userId } });
    if (!vehicle) throw new NotFoundException('Vehículo no encontrado');
    if (dto.seats !== undefined) {
      if (dto.seats < 1 || dto.seats > 8) {
        throw new BadRequestException('Las plazas deben estar entre 1 y 8');
      }
      vehicle.seats = dto.seats;
    }
    if (dto.fuelType !== undefined) {
      if (!FUEL_TYPES.includes(dto.fuelType as (typeof FUEL_TYPES)[number])) {
        throw new BadRequestException('Combustible inválido');
      }
      vehicle.fuelType = dto.fuelType;
    }
    return this.vehiclesRepo.save(vehicle);
  }

  async remove(userId: string, id: string) {
    const vehicle = await this.vehiclesRepo.findOne({ where: { id, ownerId: userId } });
    if (!vehicle) throw new NotFoundException('Vehículo no encontrado');
    const futureRides = await this.ridesRepo.count({
      where: { vehicleId: id, status: 'active' },
    });
    if (futureRides > 0) {
      throw new ConflictException(
        'No puedes borrar un vehículo con viajes activos. Cancela o reasigna los viajes primero',
      );
    }
    await this.vehiclesRepo.remove(vehicle);
    return { deleted: true };
  }
}
