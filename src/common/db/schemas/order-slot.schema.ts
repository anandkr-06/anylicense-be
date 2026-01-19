import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ _id: true })
export class OrderSlot {
  _id!: Types.ObjectId;

  @Prop({ required: true })
  date!: string;

  @Prop({ required: true })
  startTime!: string;

  @Prop({ required: true })
  endTime!: string;

  @Prop({ enum: ['LESSON', 'TEST'], required: true })
  type!: 'LESSON' | 'TEST';

  @Prop({
    type: {
      pickupAddress: String,
      suburb: String,
      state: String,
    },
  })
  pickupLocation?: {
    pickupAddress: string;
    suburb: string;
    state: string;
  };

  @Prop({
    enum: ['BOOKED', 'NOSHOW', 'CANCELLED', 'COMPLETED', 'RESCHEDULED','PENDING_RESCHEDULE'],
    default: 'BOOKED',
  })
  status!: string;

  @Prop({
    type: {
      actedBy: String,
      reasonType: String,
      comment: String,
      attachment: String,
      actedAt: Date,
    },
  })
  actionMeta?: any;

  @Prop({
    type: {
        requestedBy: {
            type: String,
            enum: ['LEARNER', 'INSTRUCTOR'],
          },
      status: {
        type: String,
        enum: ['PENDING', 'ACCEPTED', 'REJECTED'],
      },
      proposedSlot: {
        date: String,
        startTime: String,
        endTime: String,
      },
      requestedAt: Date,
      respondedAt: Date,
      newSlotId: Types.ObjectId,
    },
  })
  reschedule?: any;
}

export const OrderSlotSchema = SchemaFactory.createForClass(OrderSlot);
