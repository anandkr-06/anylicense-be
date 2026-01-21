import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum CourseStatus {
  PENDING = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Schema({ timestamps: true })
export class Course extends Document {
  @Prop({ type: Types.ObjectId, ref: 'CourseProvider', required: true })
  providerId!: Types.ObjectId;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  category!: string;

  @Prop({ required: true })
  mode!: string;

  @Prop({ required: true })
  level!: string;

  @Prop({ required: true })
  language!: string;

  @Prop({
    type: {
      value: Number,
      unit: String,
    },
  })
  duration!: {
    value: number;
    unit: string;
  };

  @Prop({ required: true })
  price!: number;

  @Prop()
  discountedPrice?: number;

  @Prop()
  startDate!: string;

  @Prop()
  endDate!: string;

  @Prop()
  description?: string;

  @Prop({
    type: {
      address: String,
      city: String,
      state: String,
      pincode: String,
    },
  })
  location!: {
    address: string;
    city: string;
    state: string;
    pincode: string;
  };

  @Prop({
    enum: CourseStatus,
    default: CourseStatus.PENDING,
  })
  status!: CourseStatus;

  @Prop({ default: false })
  isActive!: boolean;

  @Prop({ default: false })
  isDeleted!: boolean;

  @Prop()
  deletedAt?: Date;

}

export const CourseSchema = SchemaFactory.createForClass(Course);
