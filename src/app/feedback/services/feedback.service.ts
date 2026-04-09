import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Feedback } from '@common/db/schemas/feedback.schema';
import { CreateFeedbackDto } from '../dto/create-feedback.dto';
import { FeedbackOwnerType, FeedbackType } from '@constant/enum';
import { NotificationService } from 'modules/notifications/notification.service';


@Injectable()
export class FeedbackService {
  constructor(
    @InjectModel(Feedback.name)
    private readonly feedbackModel: Model<Feedback>,

    private readonly notificationsService: NotificationService,
  ) {}

  async createFeedback(
    dto: CreateFeedbackDto,
    userId?: string,
    ownerType?: FeedbackOwnerType,
  ): Promise<void> {
    // ✅ Save feedback in DB
    const feedback = await this.feedbackModel.create({
      ...dto,
      userId,
      ownerType,
    });

    
    // ✅ Send email notification to support/admin
    await this.notificationsService.sendFeedbackNotification({
      receiverEmail: process.env['SUPPORT_EMAIL'] || 'support@anylicence.com.au',
      receiverName: 'Support Team',
      feedbackType: dto.feedbackType,
      description: dto.description,
      attachmentUrl: dto.fileUrl || '',
    //   submittedBy: ownerType || 'User',
    submittedBy:
  ownerType === FeedbackOwnerType.LEARNER
    ? 'Learner'
    : ownerType === FeedbackOwnerType.INSTRUCTOR
    ? 'Instructor'
    : 'User',
    });
  }
}