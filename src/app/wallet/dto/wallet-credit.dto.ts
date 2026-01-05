import { IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';
import { Types } from 'mongoose';

export enum WalletTxnSource {
  ORDER = 'ORDER',
  REFUND = 'REFUND',
  STRIPE_REFUND = 'STRIPE_REFUND',
  ADMIN = 'ADMIN',
  ADJUSTMENT = 'ADJUSTMENT',
}

export class WalletTransactionDto {
  @IsMongoId()
  learnerId!: Types.ObjectId;

  @IsNumber()
  @Min(1)
  amount!: number;

  @IsEnum(WalletTxnSource)
  source!: WalletTxnSource;

  @IsOptional()
  @IsMongoId()
  referenceId?: Types.ObjectId;

  @IsOptional()
  @IsNotEmpty()
  idempotencyKey?: string;
}
