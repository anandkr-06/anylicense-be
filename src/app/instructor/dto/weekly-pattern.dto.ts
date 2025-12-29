
import { IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TimeSlotDto } from './time-slot.dto';

export class WeeklyPatternDto {
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => TimeSlotDto)
  monday?: TimeSlotDto[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => TimeSlotDto)
  tuesday?: TimeSlotDto[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => TimeSlotDto)
  wednesday?: TimeSlotDto[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => TimeSlotDto)
  thursday?: TimeSlotDto[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => TimeSlotDto)
  friday?: TimeSlotDto[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => TimeSlotDto)
  saturday?: TimeSlotDto[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => TimeSlotDto)
  sunday?: TimeSlotDto[];
}
