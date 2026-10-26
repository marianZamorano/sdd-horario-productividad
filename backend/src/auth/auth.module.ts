import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

// JwtModule se registra de forma global en AppModule (lo usa también el JwtAuthGuard).
@Module({
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
