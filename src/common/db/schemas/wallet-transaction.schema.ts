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
  GIFT_VOUCHER = 'GIFT_VOUCHER',
  SLOT_CANCELLED = 'SLOT_CANCELLED',
  FAST_CASH = 'FAST_CASH',
  LESSON_COMPLETED = 'LESSON_COMPLETED',
}


export enum WalletTxnStatus {
  COMPLETED = 'COMPLETED',
  REVERSED = 'REVERSED',
}

@Schema({ collection: 'wallet_transactions', timestamps: true })
export class WalletTransaction {
  // OLD FIELD (keep for existing learner records)
  @Prop({ type: Types.ObjectId, ref: 'Learner', index: true })
  learnerId?: Types.ObjectId;

  // NEW FIELD (for both learner + instructor)
  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  userId?: Types.ObjectId;


  @Prop({ enum: WalletTxnType, required: true })
  type!: WalletTxnType;

  @Prop({ enum: ['learner', 'instructor'], required: true,default: 'learner' })
  role!: string;

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

  @Prop({ required: false,default:'' })
  description?: string;

  @Prop({ enum: WalletTxnStatus, default: WalletTxnStatus.COMPLETED })
  status!: WalletTxnStatus;

  // 🔐 STRIPE / ORDER IDEMPOTENCY
  @Prop({ type: String, unique: true, sparse: true })
  idempotencyKey?: string;

   // 💳 CARD INFO (SAFE TO STORE)
   @Prop({required: false})
   cardBrand?: string;      // visa, mastercard
 
   @Prop({required: false})
   cardLast4?: string;      // **** 4242
 
   @Prop({required: false})
   cardExpMonth?: number;
 
   @Prop({required: false})
   cardExpYear?: number;
 
   @Prop({required: false})
   stripePaymentIntentId?: string;
 
   @Prop({required: false})
   stripeChargeId?: string;
}

export type WalletTransactionDocument = WalletTransaction & Document & { _id: Types.ObjectId };
export const WalletTransactionSchema =
  SchemaFactory.createForClass(WalletTransaction);

// 🔒 STRONG INDEXES
WalletTransactionSchema.index({ learnerId: 1, createdAt: -1 });
WalletTransactionSchema.index(
  { idempotencyKey: 1 },
  { unique: true, sparse: true },
);


