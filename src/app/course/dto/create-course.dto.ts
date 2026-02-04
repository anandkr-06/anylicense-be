import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsEnum,
  IsPositive,
  IsDateString,
  ValidateNested,
  IsArray,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { courseCategory, courseType } from '@constant/enum';

export class LocationDto {
  @IsString()
  suburb!: string;

  @IsString()
  state!: string;

  @IsString()
  postCode!: string;
}

export class CourseScheduleDto {
  @IsDateString()
  startDateTime!: string;

  @IsDateString()
  endDateTime!: string;
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

  // ✅ NEW FIELD
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CourseScheduleDto)
  schedules!: CourseScheduleDto[];

  @IsOptional()
  @IsNumber()
  @IsPositive()
  seats?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @IsEnum(courseType)
  courseType!: courseType;

  @IsOptional()
  @IsString()
  url?: string;
}
