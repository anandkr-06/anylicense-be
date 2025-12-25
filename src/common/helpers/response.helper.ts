import { ApiResponse } from 'interfaces/api-response.interfaces';
import { GENERIC_ERROR } from '@constant/errors';

export const successResponse = <T>(
  data?: T,
  message: string = 'Request successful',
  code?: string,
): ApiResponse<T> => ({
  status: 200,
  success: true,
  message,
  code,
  data,
});

export const errorResponse = (
  message: string,
  status: number = 500,
  code: string = GENERIC_ERROR,
  errors?: unknown,
): ApiResponse => ({
  status,
  success: false,
  message,
  code,
  errors,
});
