import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FeedbackController } from './controllers/feedback.controller';
import { FeedbackService } from './services/feedback.service';
import { Feedback, FeedbackSchema } from '@common/db/schemas/feedback.schema'
import { NotificationService } from 'modules/notifications/notification.service';
import { SmsService } from 'modules/sms/sms.service';
import { EmailService } from 'modules/email/email.service';
import { NotificationModule } from 'modules/notifications/notification.module';
import { SmtpModule } from '@common/smtp/smtp.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Feedback.name, schema: FeedbackSchema },
    ]),
    NotificationModule,
    SmtpModule,

  ],
  
  controllers: [FeedbackController],
  providers: [FeedbackService],
})
export class FeedbackModule {}
