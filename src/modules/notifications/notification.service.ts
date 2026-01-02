import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { SmsService } from '../sms/sms.service';
import { EmailService } from 'modules/email/email.service';

@Injectable()
export class NotificationService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly smsService: SmsService,
    private readonly emailService: EmailService,
  ) {}

  
  async testMail() {
    await this.mailerService.sendMail({
      to: "tech.anandkr@gmail.com",
      subject: 'Booking Confirmed',
      template: 'learner-booking',
    //   context: { "learner", "order" },
    });

    

    
    // await this.smsService.send(
    //     learner.mobileNumber,
    //     `Your booking is confirmed on ${order.bookedSlots[0].date}`,
    //   );
  }

  async sendLearnerConfirmation(learner: any, order:any) {
    await this.mailerService.sendMail({
      to: learner.email,
      subject: 'Booking Confirmed',
      template: 'learner-booking',
      context: { learner, order },
    });

    
    await this.smsService.send(
        learner.mobileNumber,
        `Your booking is confirmed on ${order.bookedSlots[0].date}`,
      );
  }

 
  
    async bookingConfirmed(learner:any, instructor:any, order:any) {
      await this.emailService.send(
        learner.email,
        'Booking Confirmed',
        'learner-booking',
        { learner, instructor, order },
      );
  
      await this.smsService.send(
        learner.mobileNumber,
        `Your booking is confirmed with ${instructor.fullName}`,
      );
    }
  
    async paymentFailed(user:any, order:any) {
      await this.emailService.send(
        user.email,
        'Payment Failed',
        'payment-failed',
        { order },
      );
    }
}
