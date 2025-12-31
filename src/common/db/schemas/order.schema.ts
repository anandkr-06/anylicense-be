import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema({ collection: 'orders', timestamps: true })

export class Order {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  learnerId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'InstructorProfile', required: true })
  instructorId!: Types.ObjectId;

  @Prop({ required: true })
  totalHours!: number; // 5, 10, 12

  @Prop({ required: true })
  vehicleType!: 'auto' | 'manual';

  @Prop({ required: true })
  pricePerHour!: number;

  @Prop({ required: true })
  totalAmount!: number;

  @Prop({
    type: [
      {
        date: String,
        startTime: String,
        endTime: String,
      },
    ],
    default: [],
  })
  bookedSlots!: {
    date: string;
    startTime: string;
    endTime: string;
  }[];

  @Prop({
    enum: ['PENDING', 'CONFIRMED', 'CANCELLED'],
    default: 'PENDING',
  })
  status!: string;
}


export type OrderDocument = Order & Document & { _id: Types.ObjectId };
export const OrderSchema = SchemaFactory.createForClass(Order);
