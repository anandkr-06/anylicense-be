import { courseCategory, courseStatus, courseType } from '@constant/enum';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
class Location {
  @Prop({ required: true })
  suburb!: string;

  @Prop({ required: true })
  state!: string;

  @Prop({ required: true })
  postCode!: string;
}

@Schema({ _id: false })
class CourseSchedule {
  @Prop({ type: Date, required: true })
  startDateTime!: Date;

  @Prop({ type: Date, required: true })
  endDateTime!: Date;
}


@Schema({ timestamps: true })
export class Course extends Document {
  @Prop({ type: Types.ObjectId, ref: 'CourseProvider', required: true })
  providerId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  courseName!: string;

  @Prop({
    enum: courseCategory,
    required: true,
    default: courseCategory.BIKE,
  })
  category!: courseCategory;

  @Prop({ required: true, min: 0 })
  price!: number;

  // ✅ MULTIPLE DATE-TIME SLOTS
  @Prop({
    type: [CourseSchedule],
    required: true,
    validate: [
      (value: CourseSchedule[]) => value.length > 0,
      'At least one schedule is required',
    ],
  })
  schedules!: CourseSchedule[];

  @Prop({
    type: Location,
    default: () => ({
      suburb: '',
      state: '',
      postCode: '',
    }),
  })
  location!: Location;

  @Prop({ min: 1 })
  seats?: number;

  @Prop()
  url?: string;

  @Prop({
    enum: courseType,
    required: true,
    default: courseType.WEEKEND,
  })
  courseType!: courseType;

  @Prop({
    enum: courseStatus,
    default: courseStatus.PENDING,
  })
  status!: courseStatus;

  @Prop({ default: false })
  isActive!: boolean;

  @Prop({ default: false })
  isDeleted!: boolean;

  @Prop()
  deletedAt?: Date;
}

export const CourseSchema = SchemaFactory.createForClass(Course);
CourseSchema.index({ 'schedules.startDateTime': 1 });