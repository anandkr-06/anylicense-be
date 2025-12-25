import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateAddressDto {
  @IsString()
  @IsNotEmpty()
  public label!: string;

  @IsString()
  @IsNotEmpty()
  public street!: string;

  @IsString()
  @IsNotEmpty()
  public city!: string;

  @IsString()
  @IsNotEmpty()
  public state!: string;

  @IsString()
  @IsNotEmpty()
  public country!: string;

  @IsNumber()
  @IsNotEmpty()
  public postalCode!: string;

  @IsString()
  @IsNotEmpty()
  public suburbId!: string;

  @IsOptional()
  @IsNumber()
  public longitude?: number;

  @IsOptional()
  @IsNumber()
  public latitude?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @Type(() => Number)
  @IsNumber({}, { each: true })
  coordinates?: number[];
}
