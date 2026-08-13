import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities/entities';
import { LoginDto, RegisterDto, UpdateProfileDto } from '../dto/dto';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  bio: string | null;
  createdAt: Date;
}

function toAuthUser(u: User): AuthUser {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    bio: u.bio,
    createdAt: u.createdAt,
  };
}

interface LoginAttempt {
  count: number;
  blockedUntil: number;
}

@Injectable()
export class AuthService {
  /** Rate limit simple por identificador: 5 fallos → 429 durante 60s. */
  private readonly attempts = new Map<string, LoginAttempt>();

  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  private sign(user: User): string {
    return this.jwt.sign({ sub: user.id, username: user.username });
  }

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const username = dto.username.trim();

    const existing = await this.usersRepo.findOne({
      where: [{ email }, { username }],
    });
    if (existing) {
      if (existing.email === email) {
        throw new ConflictException('El email ya está registrado');
      }
      throw new ConflictException('El username ya existe');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = (await this.usersRepo.save(
      this.usersRepo.create({ username, email, passwordHash, bio: null } as any),
    )) as unknown as User;
    return { token: this.sign(user), user: toAuthUser(user) };
  }

  async login(dto: LoginDto) {
    const identifier = dto.identifier.trim();
    const attempt = this.attempts.get(identifier);
    if (attempt && attempt.blockedUntil > Date.now()) {
      const wait = Math.ceil((attempt.blockedUntil - Date.now()) / 1000);
      throw new UnauthorizedException(`Demasiados intentos. Espera ${wait}s`);
    }

    const user = await this.usersRepo.findOne({
      where: [{ email: identifier.toLowerCase() }, { username: identifier }],
    });
    const ok = user && (await bcrypt.compare(dto.password, user.passwordHash));
    if (!ok) {
      const current = this.attempts.get(identifier) ?? { count: 0, blockedUntil: 0 };
      const count = current.count + 1;
      this.attempts.set(identifier, {
        count,
        blockedUntil: count >= 5 ? Date.now() + 60_000 : 0,
      });
      throw new UnauthorizedException('Credenciales incorrectas');
    }
    this.attempts.delete(identifier);
    return { token: this.sign(user!), user: toAuthUser(user!) };
  }

  async profile(userId: string): Promise<AuthUser> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return toAuthUser(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<AuthUser> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    if (dto.bio !== undefined) {
      if (dto.bio.length > 500) {
        throw new BadRequestException('La bio no puede superar 500 caracteres');
      }
      user.bio = dto.bio || null;
    }
    await this.usersRepo.save(user);
    return toAuthUser(user);
  }
}
