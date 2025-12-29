import { IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';

export class UpdateVehicleDto {
  @IsOptional() @IsString() registrationNumber?: string;
  @IsOptional() @IsString() licenceCategory?: string;
  @IsOptional() @IsString() make?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsNumber() year?: number;
  @IsOptional() @IsString() transmissionType?: string;
  @IsOptional() @IsNumber() ancapSafetyRating?: number;
  @IsOptional() @IsBoolean() hasDualControls?: boolean;

  @IsOptional() @IsNumber() pricePerHour?: number;
  @IsOptional() @IsNumber() testPricePerHour?: number;
}