/* eslint-disable max-classes-per-file */
import { TransmissionType } from '@constant/packages';
import { UserGender } from '@constant/users';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsDateString,
  IsArray,
  IsBoolean,
  IsInt,
  Min,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';

export class UpdateInstructorProfileDto {
  @IsOptional()
  @IsDateString({}, { message: 'dob must be a valid ISO date' })
  public dob?: string; // YYYY-MM-DD

  @IsOptional()
  @IsString()
  public firstName?: string;

  @IsOptional()
  @IsString()
  public lastName?: string;

  @IsOptional()
  @IsEnum(UserGender)
  public gender?: UserGender;
  
  @IsOptional()
  @IsString()
  profileImage?: string;

  @IsOptional()
  @IsString()
  description?: string;
 
  @IsOptional()
  @IsString()
  postCode!: string;

  @IsOptional()
  @IsEnum(TransmissionType)
  public transmissionType!: TransmissionType;

  /* ---------- Instructor Profile ---------- */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  public languagesKnown?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  public proficientLanguages?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  public instructorExperienceYears?: number;

  @IsOptional()
  @IsBoolean()
  public isMemberOfDrivingAssociation?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  public drivingAssociations?: string[];

  
}

export class UpdateAdditionalInfoDto {

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  public languagesKnown?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  public proficientLanguages?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  public instructorExperienceYears?: number;

  @IsOptional()
  @IsBoolean()
  public isMemberOfDrivingAssociation?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  public drivingAssociations!: string[];
}

export class UpdateInstructorFinancialDto {
  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  accountHolderName?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  bsbNumber?: string;

  @IsOptional()
  @IsString()
  abnNumber?: string;

  @IsOptional()
  @IsString()
  businessName?: string;
}

export class VehicleDto {
  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @IsOptional()
  @IsString()
  licenceCategory?: string;

  @IsOptional()
  @IsString()
  make?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  year?: number;

  @IsEnum(TransmissionType)
  transmissionType!: TransmissionType;

  @IsOptional()
  @IsString()
  ancapSafetyRating?: string;

  @IsOptional()
  @IsBoolean()
  hasDualControls?: boolean;
}

export class UpdateInstructorVehicleDto {
  @IsArray()
  @ArrayMaxSize(2)
  @ValidateNested({ each: true })
  @Type(() => VehicleDto)
  vehicles!: VehicleDto[];
}

export class ChangePasswordDto {
  @IsString()
  public oldPassword!: string;

  @IsString()
  public newPassword!: string;
}
