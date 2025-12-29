import { TransmissionType } from '@constant/packages';
import { IsOptional, IsString, IsIn, IsDateString } from 'class-validator';

export class SearchInstructorDto {
    @IsString()
    suburb!: string;
  
    @IsIn(['auto', 'manual'])
    vehicleType!: 'auto' | 'manual';
  
    @IsDateString()
    date!: string;
  }
  