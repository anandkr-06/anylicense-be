import { AddressDocument } from '@common/db/schemas/address.schema';
import { PackageDocument } from '@common/db/schemas/package.schema';
import { InstructorProfileResponse } from './instructor-profile.interface';

import { UserGender, UserRole } from '@constant/users';
import { ObjectId } from 'mongoose';

export interface UserResponse {
  id: string;
  publicId: string;
  email: string | null;
  role: string;

  description: string;
  mobileNumber: string;

  firstName: string;
  lastName: string | undefined;
  fullName: string;
  initials: string;



  profileImage: string | null;

  dob: string | null;
  gender: UserGender | undefined;
  postcode: string | undefined;

  languagesKnown: string[]  | undefined;            
  proficientLanguages: string[]  | undefined;       

  instructorExperienceYears: number  | undefined;
  isMemberOfDrivingAssociation: boolean  | undefined;
  transmissionType: string | null;
  profile: InstructorProfileResponse[];
}


export interface JwtPayload {
  publicId: string;
  firstName: string;
  lastName?: string | undefined;
  email: string;
  role: UserRole;
  mobileNumber: string;
  id:string
  sub:string
}
