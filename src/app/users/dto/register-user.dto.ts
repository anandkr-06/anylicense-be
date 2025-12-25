import { CreateAddressDto } from '@app/address/dto/create-address.dto';
import { TransmissionType } from '@constant/packages';
import { UserGender } from '@constant/users';
import { Type } from 'class-transformer';
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

  @IsOptional()
  @IsEnum(UserGender)
  public gender?: UserGender;

  @IsNotEmpty()
  @MinLength(8)
  public password!: string;

  @IsNotEmpty()
  public mobileNumber!: string;

  @IsNotEmpty()
  @IsEnum(TransmissionType)
  public transmissionType!: TransmissionType;

  @IsString()
  @IsOptional()
  public dob?: string;

  @IsString()
  @IsOptional()
  public subject?: string;

  @IsString()
  @IsOptional()
  public description?: string;

  @IsBoolean()
  public isTncApproved!: boolean;

  @IsBoolean()
  public isNotificationSent!: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateAddressDto)
  public address?: CreateAddressDto;
}
