import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';


@Schema({ collection: 'orders', timestamps: true })
export class Order {

  // 🔹 existing fields (unchanged)
  @Prop({ type: Types.ObjectId, ref: 'Learner', required: true })
  learnerId!: Types.ObjectId;

 
  
  @Prop({ type: Number, default: 0 })
  walletCredited!: number;



  @Prop({ type: Types.ObjectId, ref: 'InstructorProfile', required: true })
  instructorId!: Types.ObjectId;
  

  @Prop({ required: true })
  totalHours!: number;

  @Prop({ required: false, default: 0 })
  walletCreditAfterBooking!: number;


  @Prop({ required: true })
  vehicleType!: 'auto' | 'manual';

  @Prop({ required: true })
  pricePerHour!: number;

  @Prop({ default: 0 })
  discount!: number;

  @Prop({ default: 0 })
  platformCharge!: number;

  @Prop({ default: '' })
  coupons!: string;

  @Prop({ default: 0 })
  couponValue!: number;

  @Prop({ default: 0 })
  walletUsed!: number;

  @Prop({ default: 0 })
  payableAmount!: number;

  @Prop({ enum: ['NOT_REQUIRED', 'PENDING', 'PAID'], required: true })
  paymentStatus!: 'NOT_REQUIRED' | 'PENDING' | 'PAID';

  @Prop({ required: true })
  totalAmount!: number;

  @Prop({ required: true, default:0 })
  stripeAmount!: number;

  @Prop({ required: true, default:0 })
  consumedAmount!:number;


  // 🔥 UPDATED slots (append-only)
  @Prop({
    type: [
      {
        _id: { type: Types.ObjectId, auto: true }, // IMPORTANT
  
        date: { type: String, required: true },
        startTime: { type: String, required: true },
        endTime: { type: String, required: true },
        type: {
          type: String,
          enum: ['LESSON', 'TEST'],
        },
        pickupLocation: {
          pickupAddress: String,
          suburb: String,
          state: String,
        },
  
        // 🔥 SLOT-LEVEL RESCHEDULE
        reschedule: {
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
        },
      },
    ],
    default: [],
  })
  bookedSlots!: {
    _id: Types.ObjectId;
    date: string;
    startTime: string;
    endTime: string;
    type: 'LESSON' | 'TEST',
    pickupLocation?: {
      pickupAddress: string;
      suburb: string;
      state: string;
    };
    reschedule?: {
      requestedBy: 'LEARNER' | 'INSTRUCTOR';
      status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
      proposedSlot: {
        date: string;
        startTime: string;
        endTime: string;
      };
      requestedAt: Date;
      respondedAt?: Date;
    };
  }[];
  

  // ✅ NEW SAFE FIELDS
  @Prop({ enum: ['WITH_SLOTS', 'WITHOUT_SLOTS'], default: 'WITHOUT_SLOTS' })
  bookingMode!: 'WITH_SLOTS' | 'WITHOUT_SLOTS';

  
  @Prop({ enum: ['SCHEDULE', 'RESCHEDULE','CANCEL','NOSHOW','COMPLETED'], default: 'SCHEDULE' })
  appointmentStatus!: 'SCHEDULE'| 'RESCHEDULE'|'CANCEL'|'NOSHOW'|'COMPLETED';

  @Prop({ default: 0 })
  usedHours!: number;

  @Prop({ default: 0 })
  remainingHours!: number;

  @Prop({ default: 0 })
  walletCredit!: number;

  @Prop({
    enum: ['UNSCHEDULED', 'PARTIALLY_SCHEDULED', 'FULLY_SCHEDULED'],
    default: 'UNSCHEDULED',
  })
  scheduleStatus!: string;

  @Prop({
    enum: ['PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED'],
    default: 'PENDING_PAYMENT',
  })
  status!: string;
}

// export class Order {
//   @Prop({ type: Types.ObjectId, ref: 'User', required: true })
//   learnerId!: Types.ObjectId;

//   @Prop({ type: Types.ObjectId, ref: 'InstructorProfile', required: true })
//   instructorId!: Types.ObjectId;

//   @Prop({ required: true })
//   totalHours!: number; // 5, 10, 12

//   @Prop({ required: true })
//   vehicleType!: 'auto' | 'manual';

//   @Prop({ required: true })
//   pricePerHour!: number;

//   @Prop({ required: false, default: 0 })
//   discount!: number;

//   @Prop({ required: false, default: 0 })
//   platformCharge!: number;

//   @Prop({ required: false })
//   coupons!: string;

//   @Prop({ required: false, default: 0 })
//   couponValue!: number;

//   @Prop({ required: true, default: 0 })
//   walletUsed!: number;        // amount
  
//   @Prop({ required: true, default: 0 })
//   payableAmount!: number;    // remaining amount after wallet
  

//   @Prop({ enum: ['NOT_REQUIRED', 'PENDING', 'PAID'], required: true })
//   paymentStatus!: 'NOT_REQUIRED' | 'PENDING' | 'PAID';

//   @Prop({ default: 0 })
//   walletCredit!: number; // remaining amount after slot usage
  
//   @Prop({ required: true })
//   totalAmount!: number;

//   @Prop({ default: 0 })
//   usedHours!: number;

//   @Prop({ default: 0 })
//   remainingHours!: number;


//   @Prop({
//     type: [
//       {
//         date: { type: String, required: true },
//         startTime: { type: String, required: true },
//         endTime: { type: String, required: true },
  
//         // ✅ NEW (safe append)
//         pickupLocation: {
//           pickupAddress: { type: String },
//           suburb: { type: String },
//           state: { type: String },
//         },
//       },
//     ],
//     default: [],
//   })
//   bookedSlots!: {
//     date: string;
//     startTime: string;
//     endTime: string;
//     pickupLocation?: {
//       pickupAddress: string;
//       suburb: string;
//       state: string;
//     };
//   }[];
//   @Prop({
//     enum: ['WITH_SLOTS', 'WITHOUT_SLOTS'],
//     default: 'WITHOUT_SLOTS',
//   })
//   bookingMode!: 'WITH_SLOTS' | 'WITHOUT_SLOTS';
  
//   @Prop({
//     enum: ['UNSCHEDULED', 'PARTIALLY_SCHEDULED', 'FULLY_SCHEDULED'],
//     default: 'UNSCHEDULED',
//   })
//   scheduleStatus!: string;
  
//   @Prop({
//     enum: ['PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED'],
//     default: 'PENDING_PAYMENT',
//   })
//   status!: string;
// }


export type OrderDocument = Order & Document & { _id: Types.ObjectId };
export const OrderSchema = SchemaFactory.createForClass(Order);
