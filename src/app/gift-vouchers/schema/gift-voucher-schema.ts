import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class GiftVoucher {
  @Prop({ unique: true })
  code!: string;

  @Prop({ required: true })
  amount!: number;

  @Prop({ required: true })
  balance!: number;

  @Prop({ default: "PENDING" })
  @Prop({ enum: ['CREATED','PENDING','DRAFT', 'PAYMENT_PENDING', 'ACTIVE', 'FAILED', 'REDEEMED', 'EXPIRED'] })
  status!: string;

  

  @Prop({ type: Object })
  recipient!: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };

  @Prop({ type: Object })
  sender!: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };

  @Prop()
  message?: string;

  @Prop()
  paymentId?: string;

  @Prop()
  expiresAt!: Date;

   // ✅ ADD THESE
   @Prop({ type: Types.ObjectId, ref: 'Learner', index: true })
   redeemedBy?: Types.ObjectId;
 
   @Prop({ type: Date })
   redeemedAt?: Date;
   
}
export type GiftVoucherDocument = GiftVoucher & Document & { _id: Types.ObjectId };
export const GiftVoucherSchema = SchemaFactory.createForClass(GiftVoucher);
// GiftVoucherSchema.index(
//   { code: 1 },
//   {
//     unique: true,
//     partialFilterExpression: { code: { $exists: true, $ne: null } },
//   },
// );

