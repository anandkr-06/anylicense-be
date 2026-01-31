import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LearnerDocument = Learner & Document;

@Schema({
  timestamps: {
    createdAt: 'created',
    updatedAt: 'lastUpdated',
  },
})
export class Learner {
  @Prop({ required: false, unique: true, sparse: true, index: true })
referralCode?: string;

@Prop({ type: Types.ObjectId, ref: 'Learner', index: true })
referredBy?: Types.ObjectId;

  @Prop({ required: true })
  firstName!: string;

  @Prop()
  lastName?: string;

  @Prop({ required: true, unique: true, index: true })
  email!: string;

  @Prop({ required: true, unique: true, index: true })
  mobileNumber!: string;

  @Prop({ required: true })
  password!: string;

  @Prop({ required: true })
  pickUpAddress!: string;

  @Prop({ required: true })
  suburb!: string;

  @Prop({ required: true })
  state!: string;

  @Prop({ required: true })
  whichBestDescribeYou!: string;

  @Prop({ required: true })
  isNotificationSent!: boolean;

  @Prop({ required: true })
  isTncApproved!: boolean;

  @Prop({ required: true })
  purchaser?: Array<string>;
  
  @Prop({ default: false, index: true })
  isActive!: boolean;

  @Prop({ default: false, index: true })
  dob!: string;

  @Prop({ default: null})
  gender!: string;

  // Forgot password
  @Prop()
  passwordResetToken?: string;

  @Prop()
  passwordResetExpires?: Date;
  
  @Prop({ trim: true })
  emergencyContactName?: string;

  @Prop({ trim: true })
  emergencyContactNumber?: string;

  @Prop({ trim: true })
  profileImage?: string;

  @Prop({ required: false, default: 0 })
  walletBalance!: number;
}

export const LearnerSchema = SchemaFactory.createForClass(Learner);

/* Optional but recommended */
LearnerSchema.index({ email: 1 }, { unique: true });
LearnerSchema.index({ mobileNumber: 1 }, { unique: true });
