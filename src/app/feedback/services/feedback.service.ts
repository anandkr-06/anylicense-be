import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Feedback } from '@common/db/schemas/feedback.schema';
import { CreateFeedbackDto } from '../dto/create-feedback.dto';
import { FeedbackOwnerType } from '@constant/enum';

@Injectable()
export class FeedbackService {
    constructor(
        @InjectModel(Feedback.name)
        private readonly feedbackModel: Model<Feedback>,
    ) { }

    async createFeedback(
        dto: CreateFeedbackDto,
        userId?: string,
        ownerType?: FeedbackOwnerType,
    ): Promise<void> {
        await this.feedbackModel.create({
            ...dto,
            userId,
            ownerType,
        });
    }

}
