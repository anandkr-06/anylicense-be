// schemas/course-provider.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class CourseProvider extends Document {
  @Prop({ required: true })
  instituteName!: string;

  @Prop({ required: false })
  ownerName!: string;

  @Prop({ unique: true, sparse: true })
  email?: string;

  @Prop({ unique: true, sparse: true })
  phone?: string;

  @Prop({ required: true })
  password!: string;

  @Prop()
  gstNumber?: string;

  @Prop()
  logoUrl?: string;

  @Prop()
  websiteUrl?: string;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop()
  location?: string;
}

export const CourseProviderSchema =
  SchemaFactory.createForClass(CourseProvider);
