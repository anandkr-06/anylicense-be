import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InstructorLead } from '@common/db/schemas/instructor-lead.schema';
import { CreateInstructorLeadDto } from '@app/instructor/dto/create-instructor-lead.dto';
import { verifyCaptcha } from 'utils/google-captcha';
import { NotificationService } from 'modules/notifications/notification.service';
@Injectable()
export class InstructorLeadService {
  constructor(
    @InjectModel(InstructorLead.name)
    private readonly instructorLeadModel: Model<InstructorLead>,
    private readonly notificationService: NotificationService,  
  ) { }

  async create(payload: CreateInstructorLeadDto) {
    // const isCaptchaValid = await verifyCaptcha(
    //   payload.captchaToken,
    // );

    // if (!isCaptchaValid) {
    //   throw new BadRequestException(
    //     'Captcha verification failed',
    //   );
    // }

    const lead = await this.instructorLeadModel.create({
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      phone: payload.phone,
      state: payload.state,
      postCode: payload.postCode,
      message: payload.message,

      // UTM Tracking
      utmSource: payload.utmSource,
      utmMedium: payload.utmMedium,
      utmCampaign: payload.utmCampaign,
      utmContent: payload.utmContent,
      utmTerm: payload.utmTerm,
    });
await this.notificationService.sendInstructorLeadNotification({
  receiverEmail: process.env['SUPPORT_EMAIL']!,
  receiverName: 'Admin',

  firstName: lead.firstName,
  lastName: lead.lastName,
  email: lead.email,
  phone: lead.phone,
  state: lead.state,
  postCode: lead.postCode,
  message: lead.message,

  utmSource: lead.utmSource,
  utmMedium: lead.utmMedium,
  utmCampaign: lead.utmCampaign,
  utmContent: lead.utmContent,
  utmTerm: lead.utmTerm,
});
    return {
      success: true,
      message: 'Lead submitted successfully',
      data: lead,
    };
  }
}