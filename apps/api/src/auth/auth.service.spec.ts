import { UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { User } from '../entities/entities';

const makeUser = (overrides: Partial<User> = {}): User =>
  ({
    id: 'u1',
    username: 'demo',
    email: 'demo@ridepals.dev',
    passwordHash: 'x',
    bio: null,
    createdAt: new Date(),
    ...overrides,
  }) as User;

function authServiceWith(repoBehavior: { findOne: (where: any) => Promise<User | null> }) {
  const repo = {
    findOne: jest.fn(async (opts: any) => {
      // login usa where OR (array); register usa objeto simple
      if (Array.isArray(opts.where)) {
        for (const clause of opts.where) {
          const found = await repoBehavior.findOne(clause);
          if (found) return found;
        }
        return null;
      }
      return repoBehavior.findOne(opts.where);
    }),
    create: jest.fn((e: any) => e),
    save: jest.fn(async (e: any) => e),
  };
  const jwt = { sign: jest.fn(() => 'jwt-token') } as unknown as JwtService;
  return { service: new AuthService(repo as any, jwt), repo };
}

describe('AuthService — login con usuario O email (preferencia de Cristian)', () => {
  it('registro con datos nuevos → token + user', async () => {
    const { service } = authServiceWith({ findOne: async () => null });
    const res = await service.register({
      username: 'nuevo',
      email: 'nuevo@ridepals.dev',
      password: 'secreto123',
    });
    expect(res.token).toBe('jwt-token');
    expect(res.user.email).toBe('nuevo@ridepals.dev');
  });

  it('email duplicado → 409', async () => {
    const { service } = authServiceWith({ findOne: async () => makeUser() });
    await expect(
      service.register({ username: 'x', email: 'demo@ridepals.dev', password: 'secreto123' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('login con EMAIL correcto → token', async () => {
    const user = makeUser({ passwordHash: await bcrypt.hash('demo1234', 10) });
    const { service } = authServiceWith({
      findOne: async (where: any) => (where.email === 'demo@ridepals.dev' ? user : null),
    });
    const res = await service.login({ identifier: 'demo@ridepals.dev', password: 'demo1234' });
    expect(res.token).toBe('jwt-token');
  });

  it('login con USERNAME correcto → token', async () => {
    const user = makeUser({ passwordHash: await bcrypt.hash('demo1234', 10) });
    const { service } = authServiceWith({
      findOne: async (where: any) => (where.username === 'demo' ? user : null),
    });
    const res = await service.login({ identifier: 'demo', password: 'demo1234' });
    expect(res.token).toBe('jwt-token');
  });

  it('contraseña incorrecta → 401', async () => {
    const user = makeUser({ passwordHash: await bcrypt.hash('demo1234', 10) });
    const { service } = authServiceWith({ findOne: async () => user });
    await expect(
      service.login({ identifier: 'demo', password: 'mal' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
