import { Types } from 'mongoose';

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
