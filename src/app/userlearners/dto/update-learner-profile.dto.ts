import { IsOptional, IsString, IsEmail, IsBoolean } from 'class-validator';

export class UpdateLearnerProfileDto {
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
  pickUpAddress?: string;

  @IsOptional()
  @IsString()
  suburb?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  whichBestDescribeYou?: string;

  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @IsOptional()
//   @Matches(/^[0-9]{10}$/, {
//     message: 'Emergency contact number must be 10 digits',
//   })
@IsString()
  emergencyContactNumber?: string;

  @IsOptional()
  @IsString()
  profileImage?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
