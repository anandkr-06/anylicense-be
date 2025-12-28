import { IsOptional, IsString, IsEmail, IsBoolean, IsEnum } from 'class-validator';
import { TransmissionType } from '@constant/packages';

export class UpdateInstructorProfileDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  mobileNumber?: string;
  
  @IsOptional()
  @IsString()
  dob?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  
  @IsOptional()
  @IsString()
  profileImage?: string;

  @IsOptional()
  @IsString()
  description?: string;
 
  @IsOptional()
  @IsEnum(TransmissionType)
  public transmissionType!: TransmissionType;
}
