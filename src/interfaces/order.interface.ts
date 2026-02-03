import { Types } from 'mongoose';

export interface PrivateLearnerPopulated {
  _id: Types.ObjectId;
  firstName: string;
  mobileNumber: string;
  preferredVehicleType: 'AUTO' | 'MANUAL';
}

export interface PrivateOrderPopulated {
  _id: Types.ObjectId;
  status: string;
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED';
  vehicleType: 'AUTO' | 'MANUAL';
  totalAmount: number;
  createdAt: Date;
  lessonSlots: any[];
  testPackage?: any;
  privateLearnerId: PrivateLearnerPopulated;
}
