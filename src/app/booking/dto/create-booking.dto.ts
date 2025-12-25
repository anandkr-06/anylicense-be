
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLessonDto {
  @IsString()
  @IsNotEmpty()
  slotId!: string;

  @IsString()
  @IsNotEmpty()
  date!: string;

  @IsNumber()
  @IsNotEmpty()
  hours!: number;

  @IsString()
  @IsNotEmpty()
  pickupAddress!: string;

  @IsString()
  @IsNotEmpty()
  suburbId!: string;
}

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  instructorId!: string;

  @IsNumber()
  @IsNotEmpty()
  totalHours!: number;

  @IsNotEmpty()
  packageId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLessonDto)
  lessons!: CreateLessonDto[];
}
