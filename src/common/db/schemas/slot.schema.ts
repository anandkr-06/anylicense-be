import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { string } from 'joi';
import { Document, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export enum SlotStatus {
  AVAILABLE = 'available',
  BOOKED = 'booked',
  CANCELED = 'canceled',
  COMPLETED = 'completed',
}

@Schema({ timestamps: true, collection: 'slots' })
export class Slot {
  @Prop({ type: String, default: () => uuidv4(), unique: true })
  public publicId!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  public instructorId!: Types.ObjectId;

  @Prop({ required: true, index: true })
  public date!: string; // YYYY-MM-DD

  @Prop({ required: true })
  public startTime!: string; // HH:mm

  @Prop({ required: true })
  public endTime!: string; // HH:mm

  @Prop({
    type: String,
    enum: SlotStatus,
    default: SlotStatus.AVAILABLE,
    index: true,
  })
  public status!: SlotStatus;

  @Prop({ type: Date, default: null })
  public lockedAt?: Date;

  @Prop({ default: false })
isBooked?: boolean;

// ✅ Pickup location PER SLOT
// @Prop({
//   type: {
//     pickupAddress: { type: String, required: true },
//     suburb: { type: String, required: true },
//     state: { type: String, required: true },
//   },
//   required: true,
// })
// pickupLocation!: {
//   pickupAddress: string;
//   suburb: string;
//   state: string;
// };

@Prop({ type: String, default: null })
pickupAddress!: string;

@Prop({ type: String, default: null })
  suburb!: string;

  @Prop({ type: String, default: null })
  state!: string;

@Prop({ type: Types.ObjectId, ref: 'Order', default: null })
bookingId?: Types.ObjectId;

}

export type SlotDocument = Slot & Document & { _id: Types.ObjectId };
export const SlotSchema = SchemaFactory.createForClass(Slot);

SlotSchema.index({ instructorId: 1, date: 1 });
SlotSchema.index({ date: 1, status: 1 });
SlotSchema.index({ instructorId: 1, status: 1 });
