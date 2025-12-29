import { IsOptional, IsString, IsDateString, IsNumber } from 'class-validator';

export class UpdateDocumentDto {
  @IsOptional()
  @IsString()
  documentNumber?: string | null;

  @IsOptional()
  @IsDateString()
  issueDate?: string | null;

  @IsOptional()
  @IsDateString()
  expiryDate?: string | null;

  @IsOptional()
  @IsNumber()
  expiryCycleMonths?: number;

  @IsOptional()
  @IsString()
  attachment?: string | null;
}
