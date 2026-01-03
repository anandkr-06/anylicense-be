
import { TransmissionType } from '@constant/packages';
import { UserGender } from '@constant/users';

import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class RegisterUserDto {
  @IsNotEmpty()
  public firstName!: string;

  @IsNotEmpty()
  public lastName?: string;

  @IsEmail()
  public email!: string;

  @IsNotEmpty()
  public mobileNumber!: string;

  @IsOptional()
  @IsNotEmpty()
  @IsEnum(UserGender)
  public gender?: UserGender;

  @IsNotEmpty()
  @IsString()
  state!: string;

  @IsString()
  @IsOptional()
  public dob?: string;

  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsString()
  postCode!: string;


  @IsNotEmpty()
  @MinLength(8)
  public password!: string;

  @IsNotEmpty()
  @IsEnum(TransmissionType)
  public transmissionType!: TransmissionType;



  @IsBoolean()
  public isTncApproved!: boolean;

  @IsBoolean()
  public isNotificationSent!: boolean;

  @IsOptional()
  @IsBoolean()
  public isActive!: boolean;

  // @IsOptional()
  // @ValidateNested()
  // @Type(() => CreateAddressDto)
  // public address?: CreateAddressDto;
}
