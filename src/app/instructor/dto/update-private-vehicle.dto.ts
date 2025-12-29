// import { IsOptional, IsNumber } from 'class-validator';

// export class UpdatePrivateVehicleDto {
//   @IsOptional() @IsNumber() autoPricePerHour?: number;
//   @IsOptional() @IsNumber() autoTestPricePerHour?: number;
//   @IsOptional() @IsNumber() manualPricePerHour?: number;
//   @IsOptional() @IsNumber() manualTestPricePerHour?: number;
// }
import { IsOptional, IsNumber } from 'class-validator';

export class UpdatePrivateVehicleDto {
  @IsOptional()
  @IsNumber()
  autoPricePerHour?: number;

  @IsOptional()
  @IsNumber()
  autoTestPricePerHour?: number;

  @IsOptional()
  @IsNumber()
  manualPricePerHour?: number;

  @IsOptional()
  @IsNumber()
  manualTestPricePerHour?: number;
}
