import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  async sendMail(options: {
    to: string;
    subject: string;
    template?: string;
    context?: Record<string, any>;
    html?: string;
  }) {
    // TEMP: console log (replace with nodemailer later)
    this.logger.log(`Sending email to ${options.to}`);
    this.logger.log(`Subject: ${options.subject}`);

    return {
      success: true,
    };
  }
}
