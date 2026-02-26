import { JwtPayload } from '@interfaces/user.interface';
import { Request } from 'express';

export interface CustomRequest extends Request {
  user?: {
    publicId: string;
    email: string;
    role: string;
    sub: string;
    [key: string]: unknown;
  };
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: JwtPayload;
  }
}

export type NormalizedSlot = {
  date: string;
  startTime: string;
  endTime: string;
  type: 'LESSON' | 'TEST';

  // LESSON
  pickupAddress?: string;
  suburb?: string;
  state?: string;

  // TEST
  testLocation?: string;
  pickupPoint?: {
    pickupPoint: string;
    suburb: string;
    state: string;
  };
  dropPoint?: {
    dropPoint: string;
    suburb: string;
    state: string;
  };
};