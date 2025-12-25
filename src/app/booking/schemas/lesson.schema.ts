import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Lesson {
  @Prop({ type: Types.ObjectId, ref: 'Booking', required: true })
  public bookingId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Slot', required: true })
  public slotId!: Types.ObjectId;

  @Prop({ required: true })
  public date!: string;

  @Prop({ required: true })
  public startTime!: string;

  @Prop({ required: true })
  public endTime!: string;

  @Prop({ required: true })
  public hours!: number;

  @Prop({ required: true })
  public pickupAddress!: string;

  @Prop({ required: true })
  public suburbId!: string;
}

export type LessonDocument = Lesson & Document;
export const LessonSchema = SchemaFactory.createForClass(Lesson);
