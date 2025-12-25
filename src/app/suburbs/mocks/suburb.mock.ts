import { ApiResponse } from '@interfaces/api-response.interfaces';
import { SuburbResponse } from '@interfaces/suburb.interface';

export const mockSuburbResponse: ApiResponse<SuburbResponse[]> = {
  status: 200,
  success: true,
  message: 'Request successful',
  data: [
    {
      name: 'Ainslie',
      state: 'ACT',
      postcode: '2602',
      text: 'Ainslie, ACT 2602',
      isActive: true,
      publicId: 'a6314350-bdca-4027-b7d2-db4cc8053b42',
    },
  ],
};
