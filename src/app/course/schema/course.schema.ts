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

@Schema({ _id: false })
// class Location {
//   @Prop({ default: '' })
//   address!: string;

//   @Prop({ default: '' })
//   city!: string;

//   @Prop({ default: '' })
//   state!: string;

//   @Prop({ default: '' })
//   pincode!: string;
// }


@Schema({ timestamps: true })
export class Course extends Document {
  @Prop({ type: Types.ObjectId, ref: 'CourseProvider', required: true })
  providerId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  courseName!: string;

  @Prop({ required: true })
  category!: string;

  @Prop({ required: true, min: 0 })
  price!: number;

  @Prop({ type: Date, required: true })
  startDate!: Date;

  @Prop({ type: Date, required: true })
  endDate!: Date;

  // @Prop({
  //   type: Location,
  //   default: () => ({
  //     address: '',
  //     city: '',
  //     state: '',
  //     pincode: '',
  //   }),
  // })
  // location!: Location;
  @Prop({ required: true, trim: true })
  location!:string ;

  @Prop({ min: 1 })
  seats?: number;

  @Prop()
  url?: string;

  @Prop({
    enum: CourseType,
    required: true,
    default: CourseType.WEEKEND,
  })
  courseType!: CourseType;

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
