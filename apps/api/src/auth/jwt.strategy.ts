import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/entities';

export interface JwtPayload {
  sub: string;
  username: string;
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'ridepals-dev-secret'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser | null> {
    const user = await this.usersRepo.findOne({ where: { id: payload.sub } });
    if (!user) return null;
    return {
      id: user.id,
      username: user.username,
      email: user.email,
    };
  }
}
