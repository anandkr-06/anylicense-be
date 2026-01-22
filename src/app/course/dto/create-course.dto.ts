import {
  isBoolean,
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
    courseName!: string;
  
    @IsNotEmpty()
    category!: string;
  
    @IsNumber()
    price!: number;
  
    @IsString()
    startDate!: string;
  
    @IsString()
    endDate!: string;
  
    @IsOptional()
    seats?: number;
  
    @IsOptional()
    location?: string;

    @IsEnum({default:true})
    isAgreedToTermsAndConditions?: boolean;

    @IsEnum({default:true})
    isAgreedToCommunicationAndOffers?: boolean;

    @IsOptional()
    url?: string;
  }
  