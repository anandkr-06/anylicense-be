import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ _id: false })
class Location {
  @Prop({ required: true })
  suburb!: string;

  @Prop({ required: true })
  state!: string;

  @Prop({ required: true })
    postCode!: string;
}

@Schema({ timestamps: true })
export class Lead {
  @Prop() firstName!: string;
  @Prop() lastName!: string;
  @Prop() email!: string;
  @Prop() phone!: string;
  @Prop() userType!: string;

  @Prop({ type: Types.ObjectId, ref: 'Course' })
  courseId!: Types.ObjectId;

  @Prop({
        type: Location,
        default: () => ({
          suburb: '',
          state: '',
          postCode: '',
        }),
      })
      location!: Location;

  @Prop() source!: string;
  
  @Prop({ default: true })
    isAgreedToTermsAndConditions!: boolean;
  
    @Prop({ default: true })
    isAgreedToCommunicationAndOffers!: boolean;
}

export const LeadSchema =
  SchemaFactory.createForClass(Lead);