import { Types } from 'mongoose';

export type OrderLean = {
  _id: Types.ObjectId;
  status: string;
  bookedSlots: OrderBookedSlot[];
  learnerId?: {
    firstName: string;
    lastName: string;
    profileImage?: string;
  };
};

type OrderBookedSlot = {
  date: string;
  startTime: string;
  endTime: string;
};
