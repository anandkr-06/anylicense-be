import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum ReviewStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}
@Schema({ timestamps: true })

export class InstructorReview extends Document {

  // @Prop({ type: Types.ObjectId, required: true, ref: 'InstructorProfile' })
  // instructorId!: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
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

  // ✅ NEW FIELD
  @Prop({
    type: String,
    enum: ReviewStatus,
    default: ReviewStatus.PENDING,
    index: true,
  })
  status!: ReviewStatus;
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

