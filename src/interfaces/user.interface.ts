import { AddressDocument } from '@common/db/schemas/address.schema';
import { PackageDocument } from '@common/db/schemas/package.schema';
import { UserRole } from '@constant/users';

export interface UserResponse {
  id: string;
  publicId: string;
  email: string;
  mobileNumber: string;
  subject?: string;
  description?: string;
  role: UserRole;
  firstName: string;
  lastName?: string | undefined;
  fullName: string;
  initials: string;
  address?: AddressDocument[] | [];
  packages?: PackageDocument[] | [];
}

export interface JwtPayload {
  publicId: string;
  firstName: string;
  lastName?: string | undefined;
  email: string;
  role: UserRole;
  mobileNumber: string;
}
