import {
  IsString,
  IsArray,
  ValidateNested,
  ArrayNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TimeSlotDto } from './time-slot.dto';


export class AvailabilityDayDto {
  @IsString()
  date!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => TimeSlotDto)
  slots!: TimeSlotDto[];
}