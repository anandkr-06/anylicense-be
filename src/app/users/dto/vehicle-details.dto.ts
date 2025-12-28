import {ValidateNested, IsOptional, IsString, IsEmail, IsBoolean, IsEnum, IsNumber } from 'class-validator';

  import { Type } from 'class-transformer';
export class PriceBlockDto {
    @IsOptional()
    @IsNumber()
    price?: number;
  
    @IsOptional()
    @IsString()
    currency?: string;
  }
  export class VehicleWithDetailsDto {
    @IsOptional()
    @IsBoolean()
    hasVehicle?: boolean;
  
    @IsOptional()
    @IsString()
    model?: string;
  }
  
  
  
  export class PrivateVehicleDto {
    @IsBoolean()
    hasVehicle!: boolean;
  
    @IsOptional()
    @ValidateNested()
    @Type(() => PriceBlockDto)
    auto?: PriceBlockDto;
  
    @IsOptional()
    @ValidateNested()
    @Type(() => PriceBlockDto)
    manual?: PriceBlockDto;

  }
  
export class VehiclesDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => VehicleWithDetailsDto)
  auto?: VehicleWithDetailsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => VehicleWithDetailsDto)
  manual?: VehicleWithDetailsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PrivateVehicleDto)
  private?: PrivateVehicleDto;
}

export class UpdateVehicleDetailsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => VehiclesDto)
  vehicles?: VehiclesDto;
}
