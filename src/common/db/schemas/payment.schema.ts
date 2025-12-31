import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema({ collection: 'payments', timestamps: true })

@Schema({ timestamps: true })
export class Payment {
  @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
  orderId!: Types.ObjectId;

  @Prop({ required: true })
  amount!: number;

  @Prop({
    enum: ['INITIATED', 'SUCCESS', 'FAILED'],
    default: 'INITIATED',
  })
  status!: string;

  @Prop()
  stripePaymentIntentId!: string;

  @Prop()
  stripeChargeId?: string;
}



export type PaymentDocument = Payment & Document & { _id: Types.ObjectId };
export const PaymentSchema = SchemaFactory.createForClass(Payment);
