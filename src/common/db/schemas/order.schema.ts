import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { OrderSlot, OrderSlotSchema } from './order-slot.schema';


@Schema({ collection: 'orders', timestamps: true })
export class Order {

  // 🔹 existing fields (unchanged)
  @Prop({ type: Types.ObjectId, ref: 'Learner', required: true })
  learnerId!: Types.ObjectId;



  @Prop({ type: Number, default: 0 })
  walletCredited!: number;



  @Prop({ type: Types.ObjectId, ref: 'InstructorProfile', required: true })
  instructorId!: Types.ObjectId;


  @Prop({ required: true })
  totalHours!: number;

  @Prop({ required: false, default: 0 })
  walletCreditAfterBooking!: number;


  @Prop({ required: true })
  vehicleType!: 'auto' | 'manual';

  @Prop({ required: true })
  pricePerHour!: number;

  @Prop({ default: 0 })
  testPrice!: number;
  

  @Prop({ default: 0 })
  discount!: number;

  @Prop({ default: 0 })
  platformCharge!: number;

  @Prop({ default: '' })
  coupons!: string;

  @Prop({ default: 0 })
  couponValue!: number;

  @Prop({ default: 0 })
  walletUsed!: number;

  @Prop({ default: 0 })
  payableAmount!: number;

  @Prop({ default: 0 })
  purchaseAmount!: number;   // ✅ ADD THIS

  @Prop({ enum: ['NOT_REQUIRED', 'PENDING', 'PAID'], required: true })
  paymentStatus!: 'NOT_REQUIRED' | 'PENDING' | 'PAID';

  @Prop({ required: true })
  totalAmount!: number;

  @Prop({ required: true, default: 0 })
  stripeAmount!: number;

  @Prop({ required: true, default: 0 })
  consumedAmount!: number;


  @Prop({ type: [OrderSlotSchema], default: [] })
  bookedSlots!: Types.DocumentArray<OrderSlot>;


  // ✅ NEW SAFE FIELDS
  @Prop({ enum: ['WITH_SLOTS', 'WITHOUT_SLOTS'], default: 'WITHOUT_SLOTS' })
  bookingMode!: 'WITH_SLOTS' | 'WITHOUT_SLOTS';


  @Prop({ default: 0 })
  usedHours!: number;

  @Prop({ required: false})
  orderTypeFullName!: string;

  @Prop({ default: 0 })
  remainingHours!: number;

  @Prop({ default: 0 })
  walletCredit!: number;

  @Prop({
    enum: ['UNSCHEDULED', 'PARTIALLY_SCHEDULED', 'FULLY_SCHEDULED'],
    default: 'UNSCHEDULED',
  })
  scheduleStatus!: string;

  @Prop({
    enum: ['PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED','CONFIRMING'],
    default: 'PENDING_PAYMENT',
  })
  status!: string;
}


export type OrderDocument = Order & Document & { _id: Types.ObjectId };
export const OrderSchema = SchemaFactory.createForClass(Order);
