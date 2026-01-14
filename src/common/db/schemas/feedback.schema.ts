import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { FeedbackType, FeedbackOwnerType } from '@constant/enum';

@Schema({ timestamps: true })
export class Feedback extends Document {
  @Prop({ enum: FeedbackType, required: true })
  feedbackType!: FeedbackType;

  @Prop({ required: true })
  description!: string;

  @Prop()
  fileUrl?: string;

  @Prop({ type: Types.ObjectId, required: true })
  userId!: Types.ObjectId;

  @Prop({ enum: FeedbackOwnerType, required: true })
  ownerType!: FeedbackOwnerType;
  
}

export const FeedbackSchema = SchemaFactory.createForClass(Feedback);
