export const mockCreatePackage = {
  name: 'Test Package',
  description: 'one two three',
  transmissionType: 'auto',
  durationInHours: 2,
  amountPerHour: 90,
};

export const mockPackage = {
  publicId: '691d896e43444e04af4083d6',
  name: 'Test Package',
  description: 'one two three',
  transmissionType: 'auto',
  durationInHours: 2,
  amountPerHour: 90,
  isActive: false,
};
export const mockCreatePackageResponse = {
  status: 200,
  success: true,
  message: 'Request successful',
  data: {
    package: mockPackage,
  },
};

export const mockGetAllResponse = {
  status: 200,
  success: true,
  message: 'Request successful',
  data: {
    allPackages: [mockPackage],
  },
};

export const mockPackageResponseById = {
  status: 200,
  success: true,
  message: 'Request successful',
  data: mockPackage,
};
