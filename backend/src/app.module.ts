import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './auth/auth.module';
import { AvailabilityModule } from './availability/availability.module';
import { JwtAuthGuard } from './common/jwt-auth.guard';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { ScheduleModule } from './schedule/schedule.module';
import { StatsModule } from './stats/stats.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.registerAsync({
      global: true,
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error('JWT_SECRET no está configurado');
        return { secret, signOptions: { expiresIn: '7d' } };
      },
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    AvailabilityModule,
    TasksModule,
    ScheduleModule,
    StatsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
