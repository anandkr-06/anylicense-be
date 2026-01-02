import { Module } from '@nestjs/common';
import { MailerService } from './mailer.service';

@Module({
  providers: [MailerService],
  exports: [MailerService], // ⭐ MUST EXPORT
})
export class MailerModule {}
