export const mockInstructor = {
  email: 'test7@gmail.com',
  publicId: '402d95f1-c965-4023-89da-6244b567998b',
  role: 'instructor',
  mobileNumber: '1234567890986',
  firstName: 'shubham',
  lastName: 'singh1',
  fullName: 'shubham singh1',
  initials: 'SS',
  address: [],
};

export const mockAllInstructorsResponse = {
  status: 200,
  success: true,
  message: 'Request successful',
  data: {
    instructors: mockInstructor,
  },
};

export const mockInstructorFilterRequest = {
  suburb: '03dd94ac-79b0-4864-aa0b-86c819fa3a34',
  transmissionType: 'auto',
  date: '2025-11-20',
};
