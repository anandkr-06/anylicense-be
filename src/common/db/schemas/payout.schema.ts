import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PayoutDocument = Payout & Document;

@Schema({ timestamps: true })
export class Payout {

  @Prop({ type: Types.ObjectId, ref: 'InstructorProfile', required: true })
  instructorId!: Types.ObjectId;

  @Prop({ required: true })
  totalAmount!: number;

  @Prop({ type: [Types.ObjectId], ref: 'InstructorTransaction' })
  transactionIds!: Types.ObjectId[];

  @Prop({
    enum: ['PENDING', 'PAID'],
    default: 'PENDING'
  })
  status!: string;

  @Prop()
  payoutWeekStart!: Date;

  @Prop()
  payoutWeekEnd!: Date;

  @Prop()
  paidAt!: Date;
}

export const PayoutSchema = SchemaFactory.createForClass(Payout);