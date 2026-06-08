import {
  IsOptional,
  IsString,
  IsEmail,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class ProviderLocationDto {
  @IsString()
  suburb!: string;

  @IsString()
  state!: string;
}

export class UpdateCourseProviderProfileDto {
  @IsOptional()
  @IsString()
  instituteName?: string;

  @IsOptional()
  @IsString()
  ownerName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  gstNumber?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  websiteUrl?: string;

  @IsOptional()
  @IsString()
  rtoNumber?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ProviderLocationDto)
  location?: ProviderLocationDto;
}
