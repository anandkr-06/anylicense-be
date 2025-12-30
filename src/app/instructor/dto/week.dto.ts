import { IsDateString, IsArray, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AvailabilityDayDto } from './availability-day.dto';

export class AvailabilityWeekDto {
  // @IsString()
  // weekId!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilityDayDto)
  days!: AvailabilityDayDto[];
}
