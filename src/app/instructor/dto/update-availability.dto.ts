import { IsOptional, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { WeeklyPatternDto } from './weekly-pattern.dto';
import { DateRangeDto } from './date-range.dto';
import { BlockedDateDto } from './blocked-date.dto';

export class UpdateAvailabilityDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => WeeklyPatternDto)
  weeklyPattern?: WeeklyPatternDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DateRangeDto)
  dateRanges?: DateRangeDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BlockedDateDto)
  blockedDates?: BlockedDateDto[];
}
