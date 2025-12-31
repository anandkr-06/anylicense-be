import { IsString, Matches, IsDateString, IsArray,ValidateNested, isString } from 'class-validator';
import { Type } from 'class-transformer';

export class RequestedSlot {
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  startTime!: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  endTime!: string;

  @IsString()
  date!: string;

}

