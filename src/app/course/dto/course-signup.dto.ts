// dto/course-signup.dto.ts
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CourseSignupDto {
  @IsNotEmpty()
  instituteName!: string;

  @IsOptional()
  ownerName!: string;

  @IsEmail()
  email!: string;

  @IsNotEmpty()
  phone!: string;

  @IsNotEmpty()
  password!: string;

  @IsOptional()
  gstNumber?: string;

  @IsOptional()
  logoUrl?: string;

  @IsOptional()
  websiteUrl?: string;

  @IsOptional()
  location?: string;
}
