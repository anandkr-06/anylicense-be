import { JwtPayload } from '@interfaces/user.interface';
import { Request } from 'express';

export interface CustomRequest extends Request {
  user?: {
    publicId: string;
    email: string;
    role: string;
    [key: string]: unknown;
  };
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: JwtPayload;
  }
}
