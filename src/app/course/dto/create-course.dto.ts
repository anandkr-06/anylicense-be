import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsEnum,
  IsPositive,
  IsDateString,
} from 'class-validator';

import { courseCategory, courseType } from '@constant/enum';


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

  // @IsOptional()
  // @ValidateNested()
  // @Type(() => LocationDto)
  // location?: LocationDto;

  @IsNotEmpty()
  @IsString()
  location!: string;

  @IsEnum(courseType)
  courseType!: courseType;

  @IsOptional()
  @IsString()
  url?: string;
}
