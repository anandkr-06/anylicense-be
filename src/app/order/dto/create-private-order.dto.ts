import {
    IsEnum,
    IsMongoId,
    IsString,
    IsBoolean,
    IsOptional,
    IsArray,
    ValidateNested,
  } from 'class-validator';
  import { Type } from 'class-transformer';
  
  class NewPrivateLearnerDto {
    @IsString()
    firstName!: string;
  
    @IsString()
    lastName!: string;
  
    @IsString()
    mobileNumber!: string;
  
    @IsOptional()
    @IsString()
    email?: string;
  
    @IsEnum(['AUTO', 'MANUAL'])
    vehicleType!: 'AUTO' | 'MANUAL';
  
    @IsString()
    pickupAddress!: string;
  
    @IsString()
    suburb!: string;
  
    @IsString()
    state!: string;
  }
  
  class LessonSlotDto {
    bookingPeriod!: number;
    date!: string;
    startTime!: string;
    endTime!: string;
  
    @IsString()
    pickupAddress!: string;
  
    @IsString()
    suburb!: string;
  
    @IsString()
    state!: string;
  }
  
  class TestPackageDto {
    date!: string;
    time!: string;
    testLocation!: string;
    pickupPoint!: string;
    dropPoint!: string;
  }
  
  export class CreatePrivateOrderDto {
    @IsOptional()
    @IsMongoId()
    privateLearnerId?: string;
  
    @IsOptional()
    @ValidateNested()
    @Type(() => NewPrivateLearnerDto)
    newLearner?: NewPrivateLearnerDto;
  
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => LessonSlotDto)
    lessonSlots!: LessonSlotDto[];
  
    @IsOptional()
    @ValidateNested()
    @Type(() => TestPackageDto)
    testPackage?: TestPackageDto;
  
    @IsOptional()
    @IsBoolean()
    isTestBooking?: boolean;
  }
  