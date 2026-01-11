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
  STRIPE = 'STRIPE',              // ✅ ADD THIS
  STRIPE_REFUND = 'STRIPE_REFUND',
  ORDER_REMAINING = 'ORDER_REMAINING',
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

  // ✅ REQUIRED FOR LEDGER
  @Prop({ required: true })
  balanceAfter!: number;

  @Prop({ enum: WalletTxnSource, required: true })
  source!: WalletTxnSource;

  // 🔁 BUSINESS REFERENCE (orderId, paymentId)
  @Prop({ type: Types.ObjectId })
  referenceEntityId?: Types.ObjectId;

  @Prop()
  description?: string;

  @Prop({ enum: WalletTxnStatus, default: WalletTxnStatus.COMPLETED })
  status!: WalletTxnStatus;

  // 🔐 STRIPE / ORDER IDEMPOTENCY
  @Prop({ type: String, unique: true, sparse: true })
  idempotencyKey?: string;

   // 💳 CARD INFO (SAFE TO STORE)
   @Prop()
   cardBrand?: string;      // visa, mastercard
 
   @Prop()
   cardLast4?: string;      // **** 4242
 
   @Prop()
   cardExpMonth?: number;
 
   @Prop()
   cardExpYear?: number;
 
   @Prop()
   stripePaymentIntentId?: string;
 
   @Prop()
   stripeChargeId?: string;
}

export const WalletTransactionSchema =
  SchemaFactory.createForClass(WalletTransaction);

// 🔒 STRONG INDEXES
WalletTransactionSchema.index({ learnerId: 1, createdAt: -1 });
WalletTransactionSchema.index(
  { idempotencyKey: 1 },
  { unique: true, sparse: true },
);


