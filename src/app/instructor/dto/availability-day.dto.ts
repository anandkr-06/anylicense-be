import { IsDateString, IsArray, ValidateNested,  Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { TimeSlotDto } from './time-slot.dto';

export class AvailabilityDayDto {
    @IsDateString()
    date!: string;
  
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => TimeSlotDto)
    slots!: TimeSlotDto[];
  }