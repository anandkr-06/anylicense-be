import { IsOptional, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { AvailabilityWeekDto } from './week.dto';
import { WeeklyPatternDto } from './weekly-pattern.dto';
import { DateRangeDto } from './date-range.dto';
import { BlockedDateDto } from './blocked-date.dto';

// export class UpdateAvailabilityDto {
//   @IsOptional()
//   @ValidateNested()
//   @Type(() => WeeklyPatternDto)
//   weeklyPattern?: WeeklyPatternDto;

//   @IsOptional()
//   @IsArray()
//   @ValidateNested({ each: true })
//   @Type(() => DateRangeDto)
//   dateRanges?: DateRangeDto[];

//   @IsOptional()
//   @IsArray()
//   @ValidateNested({ each: true })
//   @Type(() => BlockedDateDto)
//   blockedDates?: BlockedDateDto[];
// }



export class UpdateAvailabilityDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilityWeekDto)
  weeks!: AvailabilityWeekDto[];
}
