import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { SmsModule } from '../sms/sms.module';
import { EmailModule } from '../email/email.module';
import { MailerModule } from '../mailer/mailer.module';

@Module({
  imports: [
    MailerModule, // ⭐ REQUIRED
    SmsModule,
    EmailModule,
  ],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
