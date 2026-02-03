// dto/create-private-order.dto.ts
import {
    IsEnum,
    IsMongoId,
    IsString,
    IsBoolean,
    IsOptional,
  } from 'class-validator';
  
  
  export class CreatePrivateOrderDto {
    @IsMongoId()
    privateLearnerId!: string;
    
    newLearner?: {
      name?: string;
      phone?: string;
      vehicleType?: 'AUTO' | 'MANUAL';
    };
  
    lessonSlots!: {
      bookingPeriod: number;
      date: string;
      startTime: string;
      endTime: string;
      pickupAddress: string;
      suburb: string;
      state: string;
    }[];
  
    testPackage?: {
      date: string;
      time: string;
      testLocation: string;
      pickupPoint: string;
      dropPoint: string;
    };
  
    @IsEnum(['AUTO', 'MANUAL'])
    vehicleType!: 'AUTO' | 'MANUAL';
  
    @IsString()
    bookingDate!: string;
  
    @IsString()
    startTime!: string;
  
    @IsString()
    endTime!: string;
  
    @IsOptional()
    @IsBoolean()
    isTestBooking?: boolean;
  }
  