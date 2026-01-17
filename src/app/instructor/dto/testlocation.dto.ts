import { IsString, IsOptional, IsNumber } from 'class-validator';

export class TestLocationDto {
  @IsString()
  suburb!: string;

  @IsString()
  locationId!: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  postCode?: string;

  @IsOptional()
  @IsString()
  address?: string;

}
