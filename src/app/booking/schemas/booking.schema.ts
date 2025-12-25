import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export enum BookingStatus {
  PENDING = 'pending',
  PARTIALLY_BOOKED = 'partially_booked',
  FULLY_BOOKED = 'fully_booked',
  COMPLETED = 'completed',
}

@Schema({ timestamps: true })
export class Booking {
  @Prop({ type: String, default: () => uuidv4(), unique: true })
  public publicId!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  public learnerId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  public instructorId!: Types.ObjectId;

  @Prop({ required: true })
  public totalHoursPurchased!: number;

  @Prop({ default: 0 })
  public totalHoursBooked!: number;

  @Prop({ default: 0 })
  public remainingHours!: number;

  @Prop({ required: true })
  public pricePerHourLocked!: number;

  @Prop({ required: true })
  public totalAmountPaid!: number;

  @Prop({ enum: BookingStatus, default: BookingStatus.PENDING })
  public status!: BookingStatus;
}

export type BookingDocument = Booking & Document;
export const BookingSchema = SchemaFactory.createForClass(Booking);
