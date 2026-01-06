import { SlotStatus } from '@common/db/schemas/slot.schema';
import { IsString, IsEnum, IsDateString } from 'class-validator';

export class SlotDto {
    startTime!: string;
    endTime!: string;
  }
  
  export class DayDto {
    date!: string;
    slots!: SlotDto[];
  }
  
  export class UpdateWeekDto {
    startDate!: string;
    endDate!: string;
    days!: DayDto[];
  }
  