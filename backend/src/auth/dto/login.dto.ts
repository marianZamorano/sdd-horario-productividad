import { Transform } from 'class-transformer';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'El email no es válido' })
  email: string;

  @IsString({ message: 'La contraseña es obligatoria' })
  @MinLength(1, { message: 'La contraseña es obligatoria' })
  password: string;
}
