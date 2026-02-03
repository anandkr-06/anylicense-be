// dto/create-private-order.dto.ts
import {
    IsEnum,
    IsString,
    IsOptional,
    IsEmail,
  } from 'class-validator';
export class CreatePrivateLearnerDto {
    @IsString()
    firstName!: string;
  
    @IsOptional()
    @IsString()
    lastName?: string;
  
    @IsString()
    mobileNumber!: string;
  
    @IsOptional()
    @IsEmail()
    email?: string;
  
    @IsEnum(['AUTO', 'MANUAL'])
    preferredVehicleType!: 'AUTO' | 'MANUAL';
  }
  