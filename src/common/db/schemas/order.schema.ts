import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema({ collection: 'orders', timestamps: true })

export class Order {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  learnerId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'InstructorProfile', required: true })
  instructorId!: Types.ObjectId;

  @Prop({ required: true })
  totalHours!: number; // 5, 10, 12

  @Prop({ required: true })
  vehicleType!: 'auto' | 'manual';

  @Prop({ required: true })
  pricePerHour!: number;

  @Prop({ required: false, default: 0 })
  discount!: number;

  @Prop({ required: false, default: 0 })
  platformCharge!: number;

  @Prop({ required: false })
  coupons!: string;

  @Prop({ required: false, default: 0 })
  couponValue!: number;

  @Prop({ required: true, default: 0 })
  walletUsed!: number;        // amount
  
  @Prop({ required: true, default: 0 })
  payableAmount!: number;    // remaining amount after wallet

  @Prop({ enum: ['NOT_REQUIRED', 'PENDING', 'PAID'], required: true })
  paymentStatus!: 'NOT_REQUIRED' | 'PENDING' | 'PAID';


  @Prop({ required: true })
  totalAmount!: number;

  @Prop({
    type: [
      {
        date: String,
        startTime: String,
        endTime: String,
      },
    ],
    default: [],
  })
  bookedSlots!: {
    date: string;
    startTime: string;
    endTime: string;
  }[];

  @Prop({
    enum: ['PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED'],
    default: 'PENDING_PAYMENT',
  })
  status!: string;
}


export type OrderDocument = Order & Document & { _id: Types.ObjectId };
export const OrderSchema = SchemaFactory.createForClass(Order);
