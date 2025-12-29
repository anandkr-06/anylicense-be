import { IsDateString, IsOptional, IsString } from 'class-validator';

export class BlockedDateDto {
  @IsDateString()
  date!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
