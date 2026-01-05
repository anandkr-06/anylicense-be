import { IsEnum, IsMongoId, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { WalletTxnSource } from './wallet-transaction.dto';

export enum WalletAdjustType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
}

export class WalletAdminAdjustDto {
  @IsMongoId()
  learnerId!: string;

  @IsEnum(WalletAdjustType)
  type!: WalletAdjustType;

  @IsNumber()
  @Min(1)
  amount!: number;

  @IsNotEmpty()
  reason!: string;

  @IsEnum(WalletTxnSource)
  source!: WalletTxnSource;
}
