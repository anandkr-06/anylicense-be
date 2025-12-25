import { ApiResponse } from 'interfaces/api-response.interfaces';
import { UserDataDto } from '../dto/user.dto';
import { UserRole } from '@constant/users';

export const mockUserData: ApiResponse<UserDataDto> = {
  status: 200,
  success: true,
  message: 'Request successful',
  data: {
    email: 'instructor@test.com',
    publicId: 'f79e5f34-2d5a-4028-af88-df137d8908a7',
    role: UserRole.INSTRUCTOR,
    mobileNumber: '9999999999',
    firstName: 'Test',
    lastName: 'Instructor',
    fullName: 'anylicense-be',
    initials: 'KJ',
    address: [],
  },
};

export const mockLeanerData: ApiResponse<UserDataDto> = {
  status: 200,
  success: true,
  message: 'Request successful',
  data: {
    email: 'instructor@test.com',
    publicId: 'f79e5f34-2d5a-4028-af88-df137d8908a7',
    role: UserRole.LEARNER,
    mobileNumber: '9999999999',
    firstName: 'Test',
    lastName: 'Instructor',
    fullName: 'anylicense-be',
    initials: 'KJ',
    address: [],
  },
};
