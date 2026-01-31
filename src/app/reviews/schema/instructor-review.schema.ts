import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })

export class InstructorReview extends Document {
  @Prop({ type: Types.ObjectId, required: true, ref: 'Instructor' })
  instructorId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: 'Learner' })
  learnerId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  orderId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  slotId!: Types.ObjectId;

  @Prop({ type: Number, min: 1, max: 5, required: true })
  rating!: number;

  @Prop({ type: String, required: true })
  comment!: string;
}


export const InstructorReviewSchema =
  SchemaFactory.createForClass(InstructorReview);

// Prevent duplicate review by same user
InstructorReviewSchema.index(
  {
    instructorId: 1,
    learnerId: 1,
    orderId: 1,
    slotId: 1,
  },
  { unique: true }
);

