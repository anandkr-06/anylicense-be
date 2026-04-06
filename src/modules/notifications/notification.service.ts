import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { SmsService } from '../sms/sms.service';
import { EmailService } from 'modules/email/email.service';
import { MAILER_TEMPLATES } from 'modules/email/email.constants';
@Injectable()
export class NotificationService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly smsService: SmsService,
    private readonly emailService: EmailService,
  ) { }


  async testMail() {
    await this.mailerService.sendMail({
      to: "tech.anandkr@gmail.com",
      subject: 'Booking Confirmed',
      template: 'learner-booking',
      //   context: { "learner", "order" },
    });

    await this.smsService.send(
      '+919350268324',
      `Your booking is confirmed on ${new Date().toDateString()}`,
    );

  }

  /* ------------------------------------
       INSTRUCTOR SIGN UP CONFIRMATION
    ------------------------------------ */
  async sendInstructorWelcomeEmail(payload: {
    recipientEmail: string;
    instructorName: string;
    password: string;
  }) {
    await this.mailerService.sendMail({
      to: payload.recipientEmail,
      subject: 'Welcome to AnyLicence - Let’s Get You Started 🚗',
      template: MAILER_TEMPLATES.INSTRUCTOR_WELCOME,
      context: {
        instructorName: payload.instructorName,
        recipientEmail: payload.recipientEmail,
        password: payload.password,

        // URLs
        login_url: `${process.env['WEBSITE_URL']}/login`,
        profile_url: `${process.env['WEBSITE_URL']}/profile`,
        dashboard_url: `${process.env['WEBSITE_URL']}/dashboard`,

        // Branding
        support_email: process.env['SUPPORT_EMAIL'],
        website_name: process.env['WEBSITE_NAME'],
        website_url: process.env['WEBSITE_URL'],
      },
    });
  }












  async sendCourseSignUp(course: any) {
    await this.mailerService.sendMail({
      to: course.email,
      subject: 'Course Sign Up: Thank you!',
      template: 'course/course-booking',
      context: { instituteName: course.instituteName, email: course.email },
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
      template: 'course/lead-customer',
      context: {
        firstName: course.firstName, lastName: course.lastName,
        phone: course.phone, suburb: course.location.suburb,
        email: course.email, submittedAt: course.createdAt,
        support_email: process.env['SUPPORT_EMAIL'],
        website_name: process.env['WEBSITE_NAME'],
        website_url: process.env['WEBSITE_URL']
      },
    });
  }
  async sendCourseLeadProvider(course: any, provider: any) {
    await this.mailerService.sendMail({
      to: provider.email,
      subject: 'Fresh Course Lead: Thank you!',
      template: 'course/lead-provider',
      context: {
        firstName: course.firstName, lastName: course.lastName,
        phone: course.phone, suburb: course.location.suburb,
        email: course.email, submittedAt: course.createdAt, instituteName: provider.instituteName,
        support_email: process.env['SUPPORT_EMAIL'],
        website_name: process.env['WEBSITE_NAME'],
        website_url: process.env['WEBSITE_URL']
      },
    });
  }

  async sendLearnerConfirmation(learner: any, order: any) {
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



  async bookingConfirmed(learner: any, instructor: any, order: any) {
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

  async paymentFailed(user: any, order: any) {
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
    recipientPhone?: string;
  }) {
    // 📧 Email first (blocking)
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

    // 📱 SMS (non-blocking)
    if (payload.recipientPhone) {
      this.smsService
        .send(
          payload.recipientPhone,
          `🎁 Hi ${payload.recipientName}, you received a gift voucher of ₹${payload.amount} from ${payload.senderName}. Code: ${payload.voucherCode}`,
        )
        .catch(err =>
          console.error('Gift voucher SMS failed', err),
        );
    }
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
    recipientPhone?: string;
  }) {
    // 📧 Email
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

    // 📱 SMS
    if (payload.recipientPhone) {
      this.smsService
        .send(
          payload.recipientPhone,
          `💰 Hi ${payload.recipientName}, ₹${payload.amount} has been credited to your wallet via Gift Voucher (${payload.voucherCode}).`,
        )
        .catch(err =>
          console.error('Wallet credited SMS failed', err),
        );
    }
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
    senderPhone?: string;
  }) {
    // 📧 Email
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

    // 📱 SMS
    if (payload.senderPhone) {
      this.smsService
        .send(
          payload.senderPhone,
          `🎉 Hi ${payload.senderName}, your gift voucher of ₹${payload.amount} has been sent to ${payload.recipientName}. Code: ${payload.voucherCode}`,
        )
        .catch(err =>
          console.error('Sender SMS failed', err),
        );
    }
  }


  /**
   * Slot Actions
   */

  //Reschedule
  async sendRescheduleNotification(payload: {
    receiverEmail: string;
    receiverName: string;
    receiverPhone?: string;

    role: 'LEARNER' | 'INSTRUCTOR';
    action: 'AUTO_APPROVED' | 'REQUESTED' | 'ACCEPTED' | 'REJECTED';
    requestedBy?: 'LEARNER' | 'INSTRUCTOR';

    oldSlot: {
      date: string;
      startTime: string;
      endTime: string;
    };

    newSlot: {
      date: string;
      startTime: string;
      endTime: string;
    };

    vehicleType?: string;
    pickupAddress?: string;
  }) {
    let mainMessage = '';
    let ctaMessage = '';

    /* ===============================
       🎯 MESSAGE BUILDER
    =============================== */

    const isLearner = payload.role === 'LEARNER';

    switch (payload.action) {
      case 'AUTO_APPROVED':
        mainMessage = isLearner
          ? 'Your lesson has been successfully rescheduled.'
          : 'The learner has rescheduled the lesson. Please check updated schedule.';
        ctaMessage = 'View updated booking:';
        break;

      case 'REQUESTED':
        if (payload.requestedBy === 'INSTRUCTOR') {
          mainMessage = isLearner
            ? 'Your instructor has requested to reschedule your lesson.'
            : 'Your reschedule request has been sent to the learner.';
        } else {
          mainMessage = isLearner
            ? 'Your reschedule request has been sent.'
            : 'The learner has requested to reschedule the lesson.';
        }
        ctaMessage = isLearner
          ? 'Please review and respond:'
          : 'Waiting for response:';
        break;

      case 'ACCEPTED':
        mainMessage =
          'The reschedule request has been accepted. Your lesson is now updated.';
        ctaMessage = 'View updated booking:';
        break;

      case 'REJECTED':
        mainMessage = isLearner
          ? 'The reschedule request has been rejected. Your original slot remains unchanged.'
          : 'The learner has rejected your reschedule request.';
        ctaMessage = 'View booking details:';
        break;
    }

    /* ===============================
       📧 EMAIL
    =============================== */

    await this.mailerService.sendMail({
      to: payload.receiverEmail,
      subject: 'Slot Reschedule Update',
      template: MAILER_TEMPLATES.RESCHEDULE, // ✅ add this constant
      context: {
        receiverName: payload.receiverName,

        mainMessage,
        ctaMessage,

        oldDate: payload.oldSlot.date,
        oldStartTime: payload.oldSlot.startTime,
        oldEndTime: payload.oldSlot.endTime,

        newDate: payload.newSlot.date,
        newStartTime: payload.newSlot.startTime,
        newEndTime: payload.newSlot.endTime,

        vehicleType: payload.vehicleType,
        pickupAddress: payload.pickupAddress,

        support_email: process.env['SUPPORT_EMAIL'],
        website_url: process.env['WEBSITE_URL'],
      },
    });

    /* ===============================
       📱 SMS (optional)
    =============================== */

    if (payload.receiverPhone) {
      const smsText = `${mainMessage}
  New Slot: ${payload.newSlot.date} ${payload.newSlot.startTime}-${payload.newSlot.endTime}`;

      this.smsService
        .send(payload.receiverPhone, smsText)
        .catch(err => console.error('Reschedule SMS failed', err));
    }
  }

  /**
   * NO SHOW
   */

  async sendNoShowNotification(payload: {
    receiverEmail: string;
    receiverName: string;
    receiverPhone?: string;
    actedBy: 'LEARNER' | 'INSTRUCTOR';
    slotDate: string;
    startTime: string;
    endTime: string;
    reasonType?: string;
    comment?: string;
  }) {
    await this.mailerService.sendMail({
      to: payload.receiverEmail,
      subject: 'Slot Marked as No-Show',
      template: MAILER_TEMPLATES.NO_SHOW,
      context: {
        receiverName: payload.receiverName,
        actedBy: payload.actedBy,
        slotDate: payload.slotDate,
        startTime: payload.startTime,
        endTime: payload.endTime,
        reasonType: payload.reasonType,
        comment: payload.comment,
        website_url: process.env['WEBSITE_URL'],
      },
    });

    if (payload.receiverPhone) {
      this.smsService
        .send(
          payload.receiverPhone,
          `Slot on ${payload.slotDate} (${payload.startTime}) marked as NO-SHOW`,
        )
        .catch(() => { });
    }
  }

  /**
   * slot completed
   */

  async sendSlotCompletedNotification(payload: {
    receiverEmail: string;
    receiverName: string;
    receiverPhone?: string;
    slotDate: string;
    startTime: string;
    endTime: string;
    type: string;
    hours?: number;
    instructorEarning?: number;
  }) {
    await this.mailerService.sendMail({
      to: payload.receiverEmail,
      subject: 'Slot Completed Successfully',
      template: MAILER_TEMPLATES.SLOT_COMPLETED,
      context: {
        receiverName: payload.receiverName,
        slotDate: payload.slotDate,
        startTime: payload.startTime,
        endTime: payload.endTime,
        type: payload.type,
        hours: payload.hours,
        instructorEarning: payload.instructorEarning,
        website_url: process.env['WEBSITE_URL'],
      },
    });

    if (payload.receiverPhone) {
      this.smsService
        .send(
          payload.receiverPhone,
          `Your slot on ${payload.slotDate} is completed successfully.`,
        )
        .catch(() => { });
    }
  }

  /**
   * order mail
   */
  async sendOrderCreatedEmail(payload: {
    learnerEmail: string;
    learnerName: string;
  
    instructorEmail?: string;
    instructorName?: string;
  
    order: any;
  }) {
    const commonContext = {
      name: payload.learnerName,
      orderType: payload.order.orderTypeFullName,
      vehicleType: payload.order.vehicleType,
      totalAmount: payload.order.totalAmount,
      paymentStatus: payload.order.paymentStatus,
      slots: payload.order.bookedSlots || [],
  
      dashboard_url: `${process.env['WEBSITE_URL']}/dashboard`,
      website_url: process.env['WEBSITE_URL'],
      website_name: process.env['WEBSITE_NAME'],
    };
  
    /* 👤 Learner email */
    await this.mailerService.sendMail({
      to: payload.learnerEmail,
      subject: 'Booking Created Successfully 🚗',
      template: MAILER_TEMPLATES.ORDER_CREATED,
      context: commonContext,
    });
  
    /* 👨‍🏫 Instructor email (optional) */
    if (payload.instructorEmail) {
      await this.mailerService.sendMail({
        to: payload.instructorEmail,
        subject: 'New Booking Received 🚗',
        template: MAILER_TEMPLATES.ORDER_CREATED,
        context: {
          ...commonContext,
          name: payload.instructorName,
        },
      });
    }
  }



  /**
   * Forgot mailer service
   */
  async sendForgotPassword(payload: {
    recipientEmail: string;
    instructorName: string;
    resetLink: string;
  }) {
    await this.mailerService.sendMail({
      to: payload.recipientEmail,
      subject: 'Password Reset Request',
      template: MAILER_TEMPLATES.FORGOT_PASSWORD,
      context: {
        receiverName: payload.instructorName || 'User',
  
        // ✅ FIXED
        resetLink: payload.resetLink,
  
        // messaging
        mainMessage: 'We received a request to reset your password.',
        ctaMessage: 'Click below to reset your password securely.',
  
        expiryMinutes: 15,
  
        support_email: process.env['SUPPORT_EMAIL'],
        website_url: process.env['WEBSITE_URL'],
      },
    });
  }

/**
 * cancelled
 */
async sendSlotCancelledNotification(payload: {
  receiverEmail: string;
  receiverName: string;
  receiverPhone?: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  actedBy: string;
  reasonType: string;
  comment?: string;
}) {
  await this.mailerService.sendMail({
    to: payload.receiverEmail,
    subject: 'Slot Cancelled',
    template: MAILER_TEMPLATES.SLOT_CANCELLED, // 🔥 new template
    context: {
      receiverName: payload.receiverName,
      slotDate: payload.slotDate,
      startTime: payload.startTime,
      endTime: payload.endTime,
      actedBy: payload.actedBy,
      reasonType: payload.reasonType,
      comment: payload.comment || '',
      website_url: process.env['WEBSITE_URL'],
    },
  });

  // ✅ SMS (optional but consistent with your pattern)
  if (payload.receiverPhone) {
    this.smsService
      .send(
        payload.receiverPhone,
        `Your slot on ${payload.slotDate} from ${payload.startTime} to ${payload.endTime} has been cancelled.`,
      )
      .catch(() => {});
  }
}

}
