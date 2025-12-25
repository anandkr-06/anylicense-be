import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';

export class CreateSlotDto {
  @IsNotEmpty()
  @IsString()
  date!: string; // YYYY-MM-DD

  @IsNotEmpty()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'startTime must be in HH:mm format',
  })
  startTime!: string; // HH:mm

  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'endTime must be in HH:mm format',
  })
  @IsString()
  endTime!: string; // HH:mm
}

export class CreateSlotTimeDto {
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'startTime must be HH:mm',
  })
  startTime!: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'endTime must be HH:mm',
  })
  endTime!: string;
}

export class CreateDaySlotDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be YYYY-MM-DD',
  })
  date!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateSlotTimeDto)
  slots!: CreateSlotTimeDto[];
}

export class CreateMultipleSlotDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateDaySlotDto)
  days!: CreateDaySlotDto[];
}
