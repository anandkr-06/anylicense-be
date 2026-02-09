import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { SmsService } from '../sms/sms.service';
import { EmailService } from 'modules/email/email.service';
import { MAILER_TEMPLATES } from 'constant/mailer';
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
  }

  async sendCourseSignUp(course: any) {
    await this.mailerService.sendMail({
      to: course.email,
      subject: 'Course Sign Up: Thank you!',
      template: 'course-booking',
      context: { instituteName: course.instituteName, email:course.email },
    });

    

    
    // await this.smsService.send(
    //     learner.mobileNumber,
    //     `Your booking is confirmed on ${order.bookedSlots[0].date}`,
    //   );
  }
//Lead Customer
  async sendCourseLeadCustomer(course: any) {
    await this.mailerService.sendMail({
      to: course.email,
      subject: 'Course Interest: Thank you!',
      template: 'lead-customer',
      context: { firstName: course.firstName,lastName: course.lastName,
        phone: course.phone,suburb: course.location.suburb, 
        email:course.email,  submittedAt:course.createdAt,
        support_email:process.env['SUPPORT_EMAIL'],
        website_name:process.env['WEBSITE_NAME'],
        website_url:process.env['WEBSITE_URL'] },
    });
  }
  async sendCourseLeadProvider(course: any, provider:any) {
    await this.mailerService.sendMail({
      to: provider.email,
      subject: 'Fresh Course Lead: Thank you!',
      template: 'lead-provider',
      context: { firstName: course.firstName,lastName: course.lastName,
        phone: course.phone,suburb: course.location.suburb, 
        email:course.email,  submittedAt:course.createdAt, instituteName: provider.instituteName,
        support_email:process.env['SUPPORT_EMAIL'],
        website_name:process.env['WEBSITE_NAME'],
        website_url:process.env['WEBSITE_URL'] },
    });
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
/*
Gift Voucher module mailer templates to be added here
*/
/* ------------------------------------
     GIFT VOUCHER – RECIPIENT
  ------------------------------------ */
  async sendGiftVoucherEmail(payload: {
    recipientEmail: string;
    recipientName: string;
    senderName: string;
    amount: number;
    voucherCode: string;
    expiryDate: Date;
  }) {
    await this.mailerService.sendMail({
      to: payload.recipientEmail,
      subject: '🎁 You’ve Received a Gift Voucher!',
      template: MAILER_TEMPLATES.GIFT_RECEIVED,
      context: {
        firstName: payload.recipientName,
        senderName: payload.senderName,
        amount: payload.amount,
        voucherCode: payload.voucherCode,
        expiryDate: payload.expiryDate,
        support_email: process.env['SUPPORT_EMAIL'],
        website_name: process.env['WEBSITE_NAME'],
        website_url: process.env['WEBSITE_URL'],
      },
    });
  }

  /* ------------------------------------
     GIFT VOUCHER – WALLET CREDITED
  ------------------------------------ */
  async sendVoucherCreditedEmail(payload: {
    recipientEmail: string;
    recipientName: string;
    amount: number;
    voucherCode: string;
    creditedAt: Date;
  }) {
    await this.mailerService.sendMail({
      to: payload.recipientEmail,
      subject: '💰 Gift Voucher Credited to Your Wallet',
      template: MAILER_TEMPLATES.GIFT_CREDITED,
      context: {
        firstName: payload.recipientName,
        amount: payload.amount,
        voucherCode: payload.voucherCode,
        creditedAt: payload.creditedAt,
        support_email: process.env['SUPPORT_EMAIL'],
        website_name: process.env['WEBSITE_NAME'],
        website_url: process.env['WEBSITE_URL'],
      },
    });
  }

  /* ------------------------------------
     GIFT VOUCHER – SENDER CONFIRMATION
  ------------------------------------ */
  async sendGiftVoucherSentConfirmationEmail(payload: {
    senderEmail: string;
    senderName: string;
    recipientName: string;
    recipientEmail: string;
    amount: number;
    voucherCode: string;
    sentAt: Date;
  }) {
    await this.mailerService.sendMail({
      to: payload.senderEmail,
      subject: '🎉 Your Gift Voucher Has Been Sent',
      template: MAILER_TEMPLATES.GIFT_SENT,
      context: {
        senderName: payload.senderName,
        recipientName: payload.recipientName,
        recipientEmail: payload.recipientEmail,
        amount: payload.amount,
        voucherCode: payload.voucherCode,
        sentAt: payload.sentAt,
        support_email: process.env['SUPPORT_EMAIL'],
        website_name: process.env['WEBSITE_NAME'],
        website_url: process.env['WEBSITE_URL'],
      },
    });
  }
    
}
