import { Injectable } from '@nestjs/common';
import { ContactUsDto } from '../dto/contact-us.dto';
import { NotificationService } from 'modules/notifications/notification.service';
import { FeedbackOwnerType } from '@constant/enum';

@Injectable()
export class ContactService {
  constructor(
    private readonly notificationsService: NotificationService,
  ) {}

  async submitContactForm(
    dto: ContactUsDto,
    ownerType?: FeedbackOwnerType,
  ) {
    // ✅ Send email notification to support/admin
    await this.notificationsService.sendContactUsNotification({
      receiverEmail:
        process.env['SUPPORT_EMAIL'] ||
        'support@anylicence.com.au',

      receiverName: 'Support Team',

      // ✅ Optional SMS support
      receiverPhone: dto.phone,

      inquiryType: dto.inquiryType,

      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      message: dto.message,

      submittedBy:
        ownerType === FeedbackOwnerType.LEARNER
          ? 'Learner'
          : ownerType === FeedbackOwnerType.INSTRUCTOR
          ? 'Instructor'
          : 'User',
    });

    return {
      success: true,
      message: 'Inquiry submitted successfully',
    };
  }
}