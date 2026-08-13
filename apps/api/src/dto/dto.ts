import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PLATE_RE = /^[0-9]{4}[A-Za-z]{3}$/;

export class RecurrenceRuleDto {
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  weekdays: number[];

  @IsString()
  @Matches(TIME_RE, { message: 'Hora inválida (HH:mm)' })
  time: string;

  @IsString()
  @Matches(DATE_RE, { message: 'Fecha inválida (YYYY-MM-DD)' })
  endDate: string;
}

export class CreateVehicleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  brand: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  model: string;

  @IsString()
  @Matches(PLATE_RE, { message: 'Matrícula inválida (formato 1234ABC)' })
  plate: string;

  @IsInt()
  @Min(1)
  @Max(8)
  seats: number;

  @IsString()
  @IsIn(['gasolina', 'diesel', 'hibrido', 'electrico'])
  fuelType: string;
}

export class UpdateVehicleDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  seats?: number;

  @IsOptional()
  @IsString()
  @IsIn(['gasolina', 'diesel', 'hibrido', 'electrico'])
  fuelType?: string;
}

export class CreateRideDto {
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  origin: string;

  @IsString()
  @MinLength(3)
  @MaxLength(150)
  dest: string;

  @IsOptional()
  originLat?: number;

  @IsOptional()
  originLng?: number;

  @IsOptional()
  destLat?: number;

  @IsOptional()
  destLng?: number;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}T/, { message: 'datetime inválido (ISO)' })
  datetime: string;

  @IsInt()
  @Min(1)
  seats: number;

  @IsString()
  vehicleId: string;

  @IsOptional()
  @Min(0.5)
  @Max(50)
  price?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => RecurrenceRuleDto)
  recurrence?: RecurrenceRuleDto;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdateRideDto {
  @IsOptional()
  @Min(0.5)
  @Max(50)
  price?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  seats?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class CreateBookingDto {
  @IsString()
  rideId: string;

  @IsString()
  @Matches(DATE_RE, { message: 'Fecha inválida (YYYY-MM-DD)' })
  occurrenceDate: string;

  @IsInt()
  @Min(1)
  seats: number;
}

export class BookingStatusDto {
  @IsString()
  @IsIn(['confirmed', 'rejected'])
  status: 'confirmed' | 'rejected';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}

export class CancelBookingDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}

export class CreateReviewDto {
  @IsString()
  bookingId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}

export class CreateMessageDto {
  @IsString()
  rideId: string;

  @IsString()
  bookingId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  body: string;
}

export class CreateFavoriteDto {
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  origin: string;

  @IsString()
  @MinLength(3)
  @MaxLength(150)
  dest: string;
}

// Auth DTOs
export class RegisterDto {
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_.-]+$/, {
    message: 'El username solo admite letras, números, punto, guion y guion bajo',
  })
  username: string;

  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @Matches(/(?=.*\d)/, { message: 'La contraseña debe contener al menos un número' })
  password: string;
}

export class LoginDto {
  @IsString()
  identifier: string;

  @IsString()
  password: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;
}
