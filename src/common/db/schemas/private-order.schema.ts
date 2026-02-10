
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export class PrivateLessonSlot {
  bookingPeriod!: number; // 1 | 2 | 2.5
  date!: string;
  startTime!: string;
  endTime!: string;
  pickupAddress!: string;
  suburb!: string;
  state!: string;
  price!: number;
}


export class PrivateTestPackage {
  date!: string;
  time!: string;
  testLocation!: string;
  pickupPoint!: string;
  dropPoint!: string;
  price!: number;
}
enum OrderStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PAID = 'PAID',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}


@Schema({ timestamps: true, collection: 'privateorders' })
export class PrivateOrder {
  // @Prop({ required: true })
  // instructorId!: string;
  @Prop({
    type: Types.ObjectId,
    ref: "user",
    required: true,
  })
  instructorId!: Types.ObjectId;


  // @Prop({ required: true })
  // privateLearnerId!: string;
  @Prop({
    type: Types.ObjectId,
    ref: "privatelearner",
    required: true,
  })
  privateLearnerId!: Types.ObjectId;



  @Prop({ enum: ['AUTO', 'MANUAL'], required: true })
  vehicleType!: 'AUTO' | 'MANUAL';

  @Prop({ type: [Object], default: [] })
  lessonSlots!: PrivateLessonSlot[];

  @Prop({ type: Object })
  testPackage?: PrivateTestPackage;

  @Prop({ required: true })
  totalAmount!: number;

  // @Prop({ default: 'CREATED' })
  // status!: 'CREATED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

  @Prop({ default: 'PENDING_PAYMENT' })
  status!: OrderStatus;

  @Prop({ default: 'PENDING' })
  paymentStatus!: 'PENDING' | 'PAID' | 'FAILED';

  @Prop()
  stripePaymentIntentId?: string;

  @Prop()
  paidAt?: Date;
}



export type PrivateOrderDocument = PrivateOrder & Document;
export const PrivateOrderSchema =
  SchemaFactory.createForClass(PrivateOrder);