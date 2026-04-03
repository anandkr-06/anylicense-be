import {
  IsDateString,
  IsArray,
  ValidateNested,
  ArrayNotEmpty,
  Validate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AvailabilityDayDto } from './availability-day.dto';
import { UniqueDatesConstraint } from '../services/custom-prevent';


export class AvailabilityWeekDto {
  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => AvailabilityDayDto)

  // 👇 THIS LINE GOES HERE
  @Validate(UniqueDatesConstraint)

  days!: AvailabilityDayDto[];
}