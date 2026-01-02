import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  async send(to: string, message: string) {
    // 🔁 Replace with Twilio / MSG91 later
    this.logger.log(`SMS → ${to}: ${message}`);
    return true;
  }
}
