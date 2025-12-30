// create-availability-week.dto.ts
import { IsDateString } from 'class-validator';

export class CreateAvailabilityWeekDto {
  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;
}
