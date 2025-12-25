import { HttpStatus } from '@nestjs/common';

export const SOME_MESSAGE = 'some error message';

export const ERROR_CONFIGS: Array<{
  status: HttpStatus;
  type: string;
  code: string;
  message: string;
}> = [
  {
    status: HttpStatus.BAD_REQUEST,
    type: 'BAD_REQUEST',
    code: `${HttpStatus.BAD_REQUEST}/1901`,
    message: SOME_MESSAGE,
  },
  {
    status: HttpStatus.UNAUTHORIZED,
    type: 'UNAUTHORIZED',
    code: `${HttpStatus.UNAUTHORIZED}/1901`,
    message: 'Invalid access token',
  },
  {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    type: 'INTERNAL_SERVER_ERROR',
    code: `${HttpStatus.INTERNAL_SERVER_ERROR}/1901`,
    message: SOME_MESSAGE,
  },
];
