import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class EmailService {
  constructor(private readonly mailer: MailerService) {}

  async send(to: string, subject: string, template: string, context: any) {
    return this.mailer.sendMail({
      to,
      subject,
      template,
      context,
    });
  }
}
