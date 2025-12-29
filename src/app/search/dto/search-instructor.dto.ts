import { IsOptional, IsString, IsIn, IsDateString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
  export class SearchInstructorDto {
    @IsString()
    suburb!: string;
  
    @IsIn(['auto', 'manual'])
    vehicleType!: 'auto' | 'manual';
  
    @IsDateString()
    date!: string;
  
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;
  
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(50)
    limit?: number = 10;
  }