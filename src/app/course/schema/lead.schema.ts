import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ _id: false })
class Location {
  @Prop()
  suburb?: string;

  @Prop()
  state?: string;

  @Prop()
  postCode?: string;
}

@Schema({ timestamps: true })
export class Lead {
  @Prop() firstName!: string;
  @Prop() lastName!: string;
  @Prop() email!: string;
  @Prop() phone!: string;
  @Prop() userType!: string;

  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  courseId!: Types.ObjectId;

  // ✅ NO default
  // ✅ NO required
  @Prop({ type: Location })
  location?: Location;

  @Prop() source!: string;

  @Prop({ default: true })
  isAgreedToTermsAndConditions!: boolean;

  @Prop({ default: true })
  isAgreedToCommunicationAndOffers!: boolean;
}

export const LeadSchema = SchemaFactory.createForClass(Lead);
