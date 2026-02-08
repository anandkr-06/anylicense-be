import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum PaymentPurpose {
  ORDER = 'ORDER',
  WALLET = 'WALLET',
  GIFT_VOUCHER = 'GIFT_VOUCHER',
}

@Schema({ collection: 'payments', timestamps: true })
export class Payment {
  // ✅ OPTIONAL now
  @Prop({ type: Types.ObjectId, ref: 'Order', required: false })
  orderId?: Types.ObjectId;

  // 🎁 NEW
  @Prop({ type: Types.ObjectId, ref: 'GiftVoucher', required: false })
  giftVoucherId?: Types.ObjectId;

  @Prop({ required: true })
  amount!: number;

  @Prop({
    enum: ['INITIATED', 'SUCCESS', 'FAILED'],
    default: 'INITIATED',
  })
  status!: string;

  // 🧠 VERY IMPORTANT
  @Prop({
    enum: Object.values(PaymentPurpose),
    required: true,
  })
  purpose!: PaymentPurpose;

  @Prop()
  stripePaymentIntentId!: string;

  @Prop()
  stripeChargeId?: string;
}

export type PaymentDocument = Payment & Document & { _id: Types.ObjectId };
export const PaymentSchema = SchemaFactory.createForClass(Payment);
