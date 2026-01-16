import { Types } from 'mongoose';
import { IsDateString, Matches } from 'class-validator';
export type OrderLean = {
  _id: Types.ObjectId;
  status: string;
  vehicleType:string;
  bookedSlots: OrderBookedSlot[];
  pickupLocation?: {
    pickupAddress: string;
    suburb: string;
    state?: string;
  };
  learnerId?: {
    firstName: string;
    lastName: string;
    profileImage?: string;
    mobileNumber?:string
  };
};

type OrderBookedSlot = {
  date: string;
  startTime: string;
  endTime: string;
  pickupLocation: string
};

export class RescheduleOrderDto {
  @IsDateString()
  date!: string; // YYYY-MM-DD

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  startTime!: string; // HH:mm

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  endTime!: string; // HH:mm
}
