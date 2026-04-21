import axios from 'axios';
import { BadRequestException } from '@nestjs/common';

export async function verifyCaptcha(token: string) {
  if (!token) {
    throw new BadRequestException('Captcha missing');
  }

  const response = await axios.post(
    'https://www.google.com/recaptcha/api/siteverify',
    null,
    {
      params: {
        secret: process.env['RECAPTCHA_SECRET_KEY'],
        response: token,
      },
    },
  );

  if (!response.data.success) {
    throw new BadRequestException('Captcha verification failed');
  }

  return response.data;
}