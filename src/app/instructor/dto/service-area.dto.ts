import { IsString, IsOptional, IsNumber } from 'class-validator';

export class ServiceAreaDto {
  @IsString()
  suburb!: string;

  @IsString()
  suburbId!: string;

  @IsNumber()
  lat!: number;
  
  @IsNumber()
  long!: number;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  postcode?: string;

  @IsOptional()
  @IsNumber()
  radiusKm?: number;

}
