import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsEnum,
  IsPositive,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum CourseType {
  WEEKEND = 'Weekend',
  WEEKDAY = 'Weekday',
}

export class DurationDto {
  @IsNumber()
  @IsPositive()
  value!: number;

  @IsString()
  unit!: 'Days' | 'Months';
}

export class LocationDto {
  @IsString()
  address!: string;

  @IsString()
  city!: string;

  @IsString()
  state!: string;

  @IsString()
  pincode!: string;
}

export class CreateCourseDto {
  @IsNotEmpty()
  @IsString()
  courseName!: string;

  @IsNotEmpty()
  @IsString()
  category!: string;

  @IsNumber()
  @IsPositive()
  price!: number;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  seats?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @IsEnum(CourseType)
  courseType!: CourseType;

  @IsOptional()
  @IsString()
  url?: string;
}
