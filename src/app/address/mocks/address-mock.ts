export const address = {
  publicId: '8da21ab7-ef02-4e2c-98c4-b0c599c29c6b',
  label: 'other',
  street: '1 Martin Place',
  city: 'Sydney',
  state: 'NSW',
  country: 'Australia',
  postalCode: '2000',
  isPrimary: true,
};
export const mockAllAddressResponse = {
  status: 200,
  success: true,
  message: 'Request successful',
  data: [address],
};

export const mockAddressResponse = {
  status: 200,
  success: true,
  message: 'Request successful',
  data: address,
};

export const mockSetPrimaryResponse = {
  status: 200,
  success: true,
  message: 'Primary address updated',
  data: {},
};

export const mockCreateAddressRequest = {
  label: 'other',
  street: '1 Martin Place',
  city: 'Sydney',
  state: 'NSW',
  country: 'Australia',
  postalCode: '2000',
  coordinates: [151.209, -33.8686],
};

export const mockCreateAddressResponse = {
  status: 200,
  success: true,
  message: 'Added successfully',
  data: {},
};
