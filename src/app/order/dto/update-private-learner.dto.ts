import { IsOptional, IsString, IsEnum } from 'class-validator';

export class UpdatePrivateLearnerDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  mobileNumber?: string;

  @IsOptional()
  @IsEnum(['AUTO', 'MANUAL'])
  preferredVehicleType?: 'AUTO' | 'MANUAL';
}
