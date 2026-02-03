// private-learner.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'privatelearners' })
export class PrivateLearner {
  @Prop({ required: true })
  firstName!: string;

  @Prop()
  lastName?: string;

  @Prop({ required: true })
  mobileNumber!: string;

  @Prop()
  email?: string;

  @Prop()
  pickupAddress?: string;

  @Prop()
  suburb?: string;

  @Prop()
  state?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  instructorId!: Types.ObjectId;

  @Prop({ enum: ['AUTO', 'MANUAL'], required: true })
  preferredVehicleType!: 'AUTO' | 'MANUAL';

  @Prop({ default: true })
  isActive!: boolean;
}

export type PrivateLearnerDocument = PrivateLearner & Document;
export const PrivateLearnerSchema =
  SchemaFactory.createForClass(PrivateLearner);
