import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum CourseStatus {
  PENDING = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum CourseType {
  WEEKEND = 'Weekend',
  WEEKDAY = 'Weekday',
}

@Schema({ timestamps: true })
export class Course extends Document {
  @Prop({ type: Types.ObjectId, ref: 'CourseProvider', required: true })
  providerId!: Types.ObjectId;

  @Prop({ required: true })
  courseName!: string;

  @Prop({ required: true })
  category!: string;

  @Prop({ required: true })
  price!: number;

  @Prop()
  startDate!: string;

  @Prop()
  endDate!: string;

  @Prop()
  location!:string;

  @Prop()
  seats!:number;

  @Prop()
  url!:string;

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

  @Prop({
    enum: CourseType,
    default: CourseType.WEEKEND,
  })
  courseType!: CourseStatus;
}

export const CourseSchema = SchemaFactory.createForClass(Course);
