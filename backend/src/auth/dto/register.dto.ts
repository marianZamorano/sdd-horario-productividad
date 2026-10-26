import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { IsTimezone } from '../../common/is-timezone.validator';

const normalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class RegisterDto {
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'El email no es válido' })
  @MaxLength(254, { message: 'El email es demasiado largo' })
  email: string;

  // 72 es el límite de bcrypt (contracts/auth.md)
  @IsString({ message: 'La contraseña es obligatoria' })
  @Length(8, 72, {
    message: 'La contraseña debe tener entre 8 y 72 caracteres',
  })
  password: string;

  @IsOptional()
  @IsTimezone()
  timezone?: string;
}
