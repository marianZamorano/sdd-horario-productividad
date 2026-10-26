import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DomainException } from '../common/domain.exception';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';

const BCRYPT_COST = 10;
const INVALID_CREDENTIALS = 'Credenciales inválidas';

export interface UserDto {
  id: string;
  email: string;
  timezone: string;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: UserDto;
}

type UserRecord = {
  id: string;
  email: string;
  timezone: string;
  createdAt: Date;
};

/** Nunca incluye `passwordHash` (constitución V). */
function toUserDto(user: UserRecord): UserDto {
  return {
    id: user.id,
    email: user.email,
    timezone: user.timezone,
    createdAt: user.createdAt.toISOString(),
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);
    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          passwordHash,
          timezone: dto.timezone ?? 'UTC',
        },
      });
      return this.authResponse(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new DomainException(
          'EMAIL_TAKEN',
          'Ya existe una cuenta con ese email',
        );
      }
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    // Mismo mensaje si el email no existe o la contraseña falla (contracts/auth.md).
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }
    return this.authResponse(user);
  }

  async me(userId: string): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Sesión no válida o expirada');
    return toUserDto(user);
  }

  private async authResponse(user: UserRecord): Promise<AuthResponse> {
    const accessToken = await this.jwt.signAsync({ sub: user.id });
    return { accessToken, user: toUserDto(user) };
  }
}
