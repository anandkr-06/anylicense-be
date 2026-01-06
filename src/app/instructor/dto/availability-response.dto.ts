import { IsDateString, IsArray, ValidateNested,  Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { TimeSlotDto } from './time-slot.dto';

export class SlotResponseDto {
  startTime!: string;
  endTime!: string;
  isBooked!: boolean;
}
export class DayAvailabilityResponseDto {
  date!: string;
  slots!: SlotResponseDto[];
}
export class WeekAvailabilityResponseDto {
  weekId!: string;
  startDate!: string;
  endDate!: string;
  days!: DayAvailabilityResponseDto[];
}

