// location.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class PickupPointDto {
  @IsNotEmpty()
  @IsString()
  pickupPoint!: string;

  @IsNotEmpty()
  @IsString()
  suburb!: string;

  @IsNotEmpty()
  @IsString()
  state!: string;
}

export class DropPointDto {
  @IsNotEmpty()
  @IsString()
  dropPoint!: string;

  @IsNotEmpty()
  @IsString()
  suburb!: string;

  @IsNotEmpty()
  @IsString()
  state!: string;
}