import { IsOptional, IsString } from 'class-validator';

export class UpdateFinancialDetailsDto {
  @IsOptional()
  @IsString()
  bankName?: string | null;

  @IsOptional()
  @IsString()
  accountHolderName?: string | null;

  @IsOptional()
  @IsString()
  accountNumber?: string | null;

  @IsOptional()
  @IsString()
  bsbNumber?: string | null;

  @IsOptional()
  @IsString()
  abnNumber?: string | null;

  @IsOptional()
  @IsString()
  businessName?: string | null;
}
