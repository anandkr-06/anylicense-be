import { IsString, Matches } from 'class-validator';

export class TimeSlotDto {
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/) // 24h format
  startTime!: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  endTime!: string;
}