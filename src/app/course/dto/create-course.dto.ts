import {
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    ValidateNested,
  } from 'class-validator';
  import { Type } from 'class-transformer';
  
  export enum CourseMode {
    ONLINE = 'Online',
    OFFLINE = 'Offline',
  }
  
  export enum CourseLevel {
    BEGINNER = 'Beginner',
    INTERMEDIATE = 'Intermediate',
    ADVANCED = 'Advanced',
  }
  
  export class DurationDto {
    @IsNumber()
    value!: number;
  
    @IsString()
    unit!: string; // Days | Months
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
    title!: string;
  
    @IsNotEmpty()
    category!: string;
  
    @IsEnum(CourseMode)
    mode!: CourseMode;
  
    @IsEnum(CourseLevel)
    level!: CourseLevel;
  
    @IsNotEmpty()
    language!: string;
  
    @ValidateNested()
    @Type(() => DurationDto)
    duration!: DurationDto;
  
    @IsNumber()
    price!: number;
  
    @IsOptional()
    @IsNumber()
    discountedPrice?: number;
  
    @IsString()
    startDate!: string;
  
    @IsString()
    endDate!: string;
  
    @IsOptional()
    description?: string;
  
    @ValidateNested()
    @Type(() => LocationDto)
    location!: LocationDto;
  }
  