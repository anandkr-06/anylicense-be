import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly httpService: HttpService) {}

  async send(to: string, message: string): Promise<boolean> {
    const url = process.env['CELLCAST_API_URL'];
    const token = process.env['CELLCAST_AUTH_TOKEN'];
    const sender = process.env['CELLCAST_SENDERID'];

    if (!url || !token || !sender) {
      throw new Error('Cellcast environment variables are missing');
    }

    try {
      const payload = {
        message,
        contacts: [this.normalizeNumber(to)],
        sender,
      };

      const response = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }),
      );

      this.logger.log(
        `SMS sent → ${to} | response: ${JSON.stringify(response.data)}`,
      );

      return true;
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        this.logger.error(
          `SMS failed → ${to}`,
          JSON.stringify(error.response?.data),
        );
      } else if (error instanceof Error) {
        this.logger.error(`SMS failed → ${to}`, error.message);
      } else {
        this.logger.error(`SMS failed → ${to}`, 'Unknown error');
      }
      return false;
    }
  }

  private normalizeNumber(number: string): string {
    if (number.startsWith('+')) return number;
    return `+91${number}`;
  }
}
