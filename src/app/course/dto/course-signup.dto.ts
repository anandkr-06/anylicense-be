// dto/course-signup.dto.ts
import { Type } from 'class-transformer';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

export class ProviderLocationDto {
  @IsString()
  suburb!: string;

  @IsString()
  state!: string;
}

export class CourseSignupDto {
  @IsNotEmpty()
  instituteName!: string;

  @IsEmail()
  email!: string;

  @IsNotEmpty()
  phone!: string;

  @IsNotEmpty()
  password!: string;

  @IsOptional()
  logoUrl?: string;

  @IsOptional()
  websiteUrl?: string;

  @IsOptional()
  rtoNumber?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ProviderLocationDto)
  location?: ProviderLocationDto;

  @IsEnum({default:true})
  isAgreedToTermsAndConditions?: boolean;

  @IsEnum({default:true})
  isAgreedToCommunicationAndOffers?: boolean;

  @IsOptional()
  isPaid?: boolean;

  captchaToken!: string; // 👈 add this
}
