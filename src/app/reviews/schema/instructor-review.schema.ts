import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class InstructorReview extends Document {
  @Prop({ type: Types.ObjectId, required: true, ref: 'Instructor' })
  instructorId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1, max: 5 })
  rating!: number;

  @Prop({ type: String, required: true, trim: true })
  comment!: string;
}

export const InstructorReviewSchema =
  SchemaFactory.createForClass(InstructorReview);

// Prevent duplicate review by same user
InstructorReviewSchema.index(
  { instructorId: 1, userId: 1 },
  { unique: true }
);
