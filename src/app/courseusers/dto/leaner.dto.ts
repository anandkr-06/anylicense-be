import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsDefined,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateAddressDto {
  @IsString()
  @IsNotEmpty()
  public pickUpAddress!: string;

  @IsString()
  @IsNotEmpty()
  public state!: string;

  @IsString()
  @IsNotEmpty()
  public suburbId!: string;
}

export class SelfLeanerRegisterDto {
  @IsNotEmpty()
  public firstName!: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  bestDescribe?: string;

  @IsEmail()
  public email!: string;

  @IsNotEmpty()
  @MinLength(8)
  public password!: string;

  //   @Matches(/^[0-9]{10}$/, {
  //     message: 'Mobile number must be a valid 10 digit number',
  //   })
  @IsString()
  mobileNumber!: string;

  @IsString()
  public dob!: string;

  @IsBoolean()
  public isTncApproved!: boolean;

  @IsBoolean()
  public isNotificationSent!: boolean;

  @IsDefined({ message: 'Address is required' })
  @ValidateNested()
  @Type(() => CreateAddressDto)
  address!: CreateAddressDto;
}

export class PurchaserDetailDto {
  @IsNotEmpty()
  public firstName!: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  bestDescribe?: string;

  @IsEmail()
  public email!: string;

  @IsString()
  mobileNumber!: string;

  @IsString()
  public dob!: string;
}

export class SomeOneLeanerRegisterDto {
  @IsNotEmpty()
  public firstName!: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  bestDescribe?: string;

  @IsEmail()
  public email!: string;

  @IsNotEmpty()
  @MinLength(8)
  public password!: string;

  @IsString()
  mobileNumber!: string;

  @IsString()
  public dob!: string;

  @IsBoolean()
  public isTncApproved!: boolean;

  @IsBoolean()
  public isNotificationSent!: boolean;

  @IsDefined({ message: 'Purchaser detail is required' })
  @ValidateNested()
  @Type(() => PurchaserDetailDto)
  purchaserDetail!: PurchaserDetailDto;

  @IsDefined({ message: 'Address is required' })
  @ValidateNested()
  @Type(() => CreateAddressDto)
  address!: CreateAddressDto;
}
