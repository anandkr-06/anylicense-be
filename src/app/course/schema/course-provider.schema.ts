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
  @Prop({ required: true })
  instituteName!: string;

  @Prop()
  ownerName?: string;

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

  // ✅ UPDATED LOCATION
  @Prop({
    type: ProviderLocation,
    default: () => ({
      suburb: '',
      state: '',
      postCode: '',
    }),
  })
  location!: ProviderLocation;

  @Prop({ default: true })
  isAgreedToTermsAndConditions?: boolean;

  @Prop({ default: true })
  isAgreedToCommunicationAndOffers?: boolean;
}

export const CourseProviderSchema =
  SchemaFactory.createForClass(CourseProvider);
