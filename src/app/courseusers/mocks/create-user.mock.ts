import { TransmissionType } from '@constant/packages';
import { RegisterUserDto } from '../dto/register-user.dto';

export const createLeanerMock: RegisterUserDto = {
  firstName: 'Test',
  lastName: 'Instructor',
  email: 'test@test.com',
  mobileNumber: '9999999999',
  password: 'TestInstructor',
  isTncApproved: true,
  transmissionType: TransmissionType.AUTO,
  description: '',
  subject: '',
  isNotificationSent: true,
  dob: '2025/10/10',
  address: {
    suburbId: 'c965fb00-26a5-4993-bfcb-74553542f28e',
    label: 'other',
    street: '1 Martin Place',
    city: 'Sydney',
    state: 'NSW',
    country: 'Australia',
    postalCode: '2000',
    coordinates: [151.209, -33.8686],
  },
};

export const createInstructorMock: RegisterUserDto = {
  firstName: 'Test',
  lastName: 'Instructor',
  email: 'test@test.com',
  mobileNumber: '9999999999',
  description: 'about user',
  subject: 'subject',

  password: 'TestInstructor',
  isTncApproved: true,
  isNotificationSent: true,
  dob: '2025/10/10',
  transmissionType: TransmissionType.AUTO,
  address: {
    suburbId: 'c965fb00-26a5-4993-bfcb-74553542f28e',
    label: 'other',
    street: '1 Martin Place',
    city: 'Sydney',
    state: 'NSW',
    country: 'Australia',
    postalCode: '2000',
    coordinates: [151.209, -33.8686],
  },
};
