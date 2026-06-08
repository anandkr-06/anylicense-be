import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false })
class ProviderLocation {
  @Prop({ required: true })
  suburb!: string;

  @Prop({ required: true })
  state!: string;

  @Prop({ required: true })
  postCode!: string;
}


@Schema({ timestamps: true })
export class CourseProvider extends Document {
  @Prop({ required: true, trim: true })
  instituteName!: string;

  @Prop({ trim: true })
  ownerName?: string;

  @Prop({
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
  })
  email?: string;

  @Prop({
    unique: true,
    sparse: true,
    trim: true,
  })
  phone?: string;

  @Prop({ required: true, minlength: 6 })
  password!: string;

  @Prop({ trim: true })
  gstNumber?: string;

  @Prop()
  logoUrl?: string;

  @Prop()
  websiteUrl?: string;

  @Prop()
  rtoNumber?: string;
  
  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ type: ProviderLocation })
  location?: ProviderLocation;

  @Prop({ default: false })
  isAgreedToTermsAndConditions!: boolean;

  @Prop({ default: false })
  isAgreedToCommunicationAndOffers!: boolean;
}

export const CourseProviderSchema =
  SchemaFactory.createForClass(CourseProvider);
