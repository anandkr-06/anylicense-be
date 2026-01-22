import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true })
export class Lead {
  @Prop() firstName!: string;
  @Prop() lastName!: string;
  @Prop() email!: string;
  @Prop() phone!: string;
  @Prop() userType!: string;

  @Prop({ type: Types.ObjectId, ref: 'Course' })
  courseId!: Types.ObjectId;

  @Prop() source!: string;
  
  @Prop({ default: true })
    isAgreedToTermsAndConditions!: boolean;
  
    @Prop({ default: true })
    isAgreedToCommunicationAndOffers!: boolean;
}

export const LeadSchema =
  SchemaFactory.createForClass(Lead);