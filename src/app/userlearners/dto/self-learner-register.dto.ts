import { IsBoolean, IsDefined, IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';

export class SelfLeanerRegisterDto {
  @IsNotEmpty()
  firstName!: string;

  @IsNotEmpty()
  @IsNotEmpty()
  lastName!: string;


  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  @IsNotEmpty()
  @IsString()
  mobileNumber!: string;

  @IsNotEmpty()
  @IsString()
  dob!: string;

  @IsNotEmpty()
  @IsBoolean()
  isTncApproved!: boolean;

  @IsNotEmpty()
  @IsBoolean()
  isNotificationSent!: boolean;


  @IsNotEmpty()
  @IsString()
  pickUpAddress!: string;

  @IsNotEmpty()
  @IsString()
  suburb!: string;

  @IsNotEmpty()
  @IsString()
  state!: string;

  @IsNotEmpty()
  @IsString()
  whichBestDescribeYou!: string;

}
