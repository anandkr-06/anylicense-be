import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InstructorTransactionDocument = InstructorTransaction & Document;

@Schema({ timestamps: true })
export class InstructorTransaction {

  @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
  orderId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  slotId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  learnerId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'InstructorProfile', required: true })
  instructorId!: Types.ObjectId;

  @Prop({ enum: ['LESSON', 'TEST'], required: true })
  type!: string;

  @Prop({ required: true })
  hours!: number;

  @Prop({ required: true })
  pricePerHour!: number;

  @Prop({ required: true })
  grossAmount!: number;

  @Prop({ default: 0 })
  platformCommission!: number;

  @Prop({ required: true })
  instructorEarning!: number;

  @Prop({
    enum: ['PENDING_PAYOUT', 'PAID', 'REFUNDED'],
    default: 'PENDING_PAYOUT',
  })
  payoutStatus!: string;

  @Prop({ type: Date })
  payoutDate!: Date;
}

export const InstructorTransactionSchema =
  SchemaFactory.createForClass(InstructorTransaction);