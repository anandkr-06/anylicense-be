import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Referral {
  @Prop({ type: Types.ObjectId, ref: 'Learner', required: true })
  referrerId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Learner', required: true })
  refereeId!: Types.ObjectId;

  @Prop({
    enum: ['CLICKED', 'REGISTERED', 'REWARDED'],
    default: 'REGISTERED',
  })
  status!: string;

  @Prop({ default: 20 })
  rewardAmount!: number;
}

export const ReferralSchema = SchemaFactory.createForClass(Referral);

ReferralSchema.index(
  { referrerId: 1, refereeId: 1 },
  { unique: true }
);
