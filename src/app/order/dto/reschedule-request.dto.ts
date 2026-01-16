import {Matches, IsDateString} from 'class-validator';
export class RescheduleRequestDto {
    @IsDateString()
    date!: string;
  
    @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    startTime!: string;
  
    @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    endTime!: string;
  }
  