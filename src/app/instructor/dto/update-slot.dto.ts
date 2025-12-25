import { SlotStatus } from '@common/db/schemas/slot.schema';
import { IsString, IsEnum, IsDateString } from 'class-validator';

export class UpdateSlotDto {
  @IsString()
  slotId!: string;

  @IsString()
  @IsDateString()
  date!: string;

  @IsString()
  startTime!: string;

  @IsString()
  endTime!: string;
}

export class UpdateSlotStatusDto {
  @IsString()
  slotId!: string;

  @IsEnum(SlotStatus)
  status!: SlotStatus;
}

export class DeleteSlotStatusDto {
  @IsString()
  slotId!: string;
}
