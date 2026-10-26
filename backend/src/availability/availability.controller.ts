import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../common/current-user.decorator';
import {
  AvailabilityService,
  type AvailabilitySlotDto,
} from './availability.service';
import { CreateSlotDto } from './dto/create-slot.dto';
import { UpdateSlotDto } from './dto/update-slot.dto';

@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<AvailabilitySlotDto[]> {
    return this.availability.list(user.id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateSlotDto,
  ): Promise<AvailabilitySlotDto> {
    return this.availability.create(user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateSlotDto,
  ): Promise<AvailabilitySlotDto> {
    return this.availability.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.availability.remove(user.id, id);
  }
}
