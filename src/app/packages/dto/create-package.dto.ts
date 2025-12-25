import { TransmissionType } from '@constant/packages';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class createPackageDto {
  @IsString()
  public name!: string;

  @IsString()
  @IsOptional()
  public description?: string;

  @IsString()
  public transmissionType!: TransmissionType;

  @IsNumber()
  public durationInHours!: number;

  @IsNumber()
  public amountPerHour!: number;
}

export class UpdatePackageDto {
  @IsString()
  public id!: string;

  @IsNumber()
  public amount!: number;
}
