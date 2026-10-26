import { BadRequestException, Injectable } from '@nestjs/common';
import { DomainException } from '../common/domain.exception';
import { assertValidId, orNotFound } from '../common/find-owned';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateSlotDto } from './dto/create-slot.dto';
import type { UpdateSlotDto } from './dto/update-slot.dto';

export interface AvailabilitySlotDto {
  id: string;
  weekday: number;
  startMinute: number;
  endMinute: number;
}

type SlotRange = Omit<AvailabilitySlotDto, 'id'>;

const toDto = ({
  id,
  weekday,
  startMinute,
  endMinute,
}: AvailabilitySlotDto): AvailabilitySlotDto => ({
  id,
  weekday,
  startMinute,
  endMinute,
});

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<AvailabilitySlotDto[]> {
    const slots = await this.prisma.availabilitySlot.findMany({
      where: { userId },
      orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }],
    });
    return slots.map(toDto);
  }

  async create(
    userId: string,
    dto: CreateSlotDto,
  ): Promise<AvailabilitySlotDto> {
    await this.assertNoOverlap(userId, dto);
    const slot = await this.prisma.availabilitySlot.create({
      data: { userId, ...dto },
    });
    return toDto(slot);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateSlotDto,
  ): Promise<AvailabilitySlotDto> {
    const current = await this.findOwned(userId, id);
    const next: SlotRange = {
      weekday: dto.weekday ?? current.weekday,
      startMinute: dto.startMinute ?? current.startMinute,
      endMinute: dto.endMinute ?? current.endMinute,
    };
    if (next.endMinute <= next.startMinute) {
      throw new BadRequestException([
        'La hora de fin debe ser posterior a la de inicio',
      ]);
    }
    await this.assertNoOverlap(userId, next, id);
    const slot = await this.prisma.availabilitySlot.update({
      where: { id },
      data: next,
    });
    return toDto(slot);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOwned(userId, id);
    await this.prisma.availabilitySlot.delete({ where: { id } });
  }

  private async findOwned(userId: string, id: string) {
    assertValidId(id);
    return orNotFound(
      await this.prisma.availabilitySlot.findFirst({ where: { id, userId } }),
    );
  }

  /** FR-005: dos franjas del mismo día se solapan si a.start < b.end && b.start < a.end. */
  private async assertNoOverlap(
    userId: string,
    range: SlotRange,
    excludeId?: string,
  ): Promise<void> {
    const overlapping = await this.prisma.availabilitySlot.findFirst({
      where: {
        userId,
        weekday: range.weekday,
        startMinute: { lt: range.endMinute },
        endMinute: { gt: range.startMinute },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    if (overlapping) {
      throw new DomainException(
        'SLOT_OVERLAP',
        'La franja se solapa con otra existente',
      );
    }
  }
}
