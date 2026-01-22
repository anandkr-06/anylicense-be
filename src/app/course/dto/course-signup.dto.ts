// dto/course-signup.dto.ts
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
  location?: string;

  @IsEnum({default:true})
  isAgreedToTermsAndConditions?: boolean;

  @IsEnum({default:true})
  isAgreedToCommunicationAndOffers?: boolean;

}
