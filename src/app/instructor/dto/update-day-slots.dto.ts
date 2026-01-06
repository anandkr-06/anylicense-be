import { IsString, IsArray, ValidateNested, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class SlotDto {
  @IsString()
  startTime!: string;

  @IsString()
  endTime!: string;
}

export class UpdateDaySlotsDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/) // YYYY-MM-DD
  date!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SlotDto)
  slots!: SlotDto[];
}
