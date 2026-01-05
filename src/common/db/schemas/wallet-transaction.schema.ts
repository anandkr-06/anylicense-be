import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum WalletTxnType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
}

export enum WalletTxnSource {
  ORDER = 'ORDER',
  REFUND = 'REFUND',
  PROMO = 'PROMO',
  ADMIN = 'ADMIN',
  STRIPE_REFUND = 'STRIPE_REFUND',
}

export enum WalletTxnStatus {
  COMPLETED = 'COMPLETED',
  REVERSED = 'REVERSED',
}

@Schema({ collection: 'wallet_transactions', timestamps: true })
export class WalletTransaction {
  @Prop({ type: Types.ObjectId, ref: 'Learner', required: true, index: true })
  learnerId!: Types.ObjectId;

  @Prop({ enum: WalletTxnType, required: true })
  type!: WalletTxnType;

  @Prop({ required: true, min: 0 })
  amount!: number;

  @Prop({ required: true })
  balanceAfter!: number;

  @Prop({ enum: WalletTxnSource, required: true })
  source!: WalletTxnSource;

  @Prop({ type: Types.ObjectId })
  referenceId?: Types.ObjectId; // orderId / paymentId

  @Prop()
  description?: string;

  @Prop({ enum: WalletTxnStatus, default: WalletTxnStatus.COMPLETED })
  status!: WalletTxnStatus;

  @Prop({ unique: true, sparse: true })
  idempotencyKey?: string;
}

export type WalletTransactionDocument = WalletTransaction & Document;
export const WalletTransactionSchema =
  SchemaFactory.createForClass(WalletTransaction);
