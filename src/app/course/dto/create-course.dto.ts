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

import { courseCategory, courseType } from '@constant/enum';
import { Type } from 'class-transformer';


export class DurationDto {
  @IsNumber()
  @IsPositive()
  value!: number;

  @IsString()
  unit!: 'Days' | 'Months';
}

export class LocationDto {
  @IsString()
  suburb!: string;

  @IsString()
  state!: string;

  @IsString()
  postCode!: string;
}

export class CreateCourseDto {
  @IsNotEmpty()
  @IsString()
  courseName!: string;

  @IsNotEmpty()
  @IsEnum(courseCategory)
  category!: courseCategory;

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

  // @IsNotEmpty()
  // @IsString()
  // location!: string;

  @IsEnum(courseType)
  courseType!: courseType;

  @IsOptional()
  @IsString()
  url?: string;
}
