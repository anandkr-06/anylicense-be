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
  testLocation?: string;
  pickupPoint?: {
    pickupPoint: string;
    suburb: string;
    state: string;
  };
  type:string;

  dropPoint?: {
    dropPoint: string;
    suburb: string;
    state: string;
  };
  learnerId?: {
    firstName: string;
    lastName: string;
    profileImage?: string;
    mobileNumber?:string
  };
};

type OrderBookedSlot = {
  _id: Types.ObjectId; 
  date: string;
  startTime: string;
  endTime: string;
  pickupLocation: string;
  pickupPoint:string;
  dropPoint:string;
  testLocation:string;
  type:string;
  status:string
  reschedule:any
};

export class RescheduleOrderDto {
  @IsDateString()
  date!: string; // YYYY-MM-DD

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  startTime!: string; // HH:mm

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  endTime!: string; // HH:mm
}
