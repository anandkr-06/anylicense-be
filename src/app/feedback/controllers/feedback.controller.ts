import {
    Body,
    Controller,
    Post,
    Param, BadRequestException,
} from '@nestjs/common';

import { FeedbackService } from '../services/feedback.service';
import { CreateFeedbackDto } from '../dto/create-feedback.dto';
import { FeedbackOwnerType } from '@constant/enum'
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtPayload } from '@interfaces/user.interface';
@Controller()
export class FeedbackController {
    constructor(private readonly feedbackService: FeedbackService) { }

    @Post(':type/feedback')
    async submitFeedback(
        @Param('type') type: string,
        @CurrentUser() currentUser: JwtPayload,
        @Body() dto: CreateFeedbackDto,
    ) {
        if (!Object.values(FeedbackOwnerType).includes(type as FeedbackOwnerType)) {
            throw new BadRequestException(
                'Type must be either learner or instructor',
            );
        }
        await this.feedbackService.createFeedback(dto, currentUser.sub, type as FeedbackOwnerType);
        return {
            success: true,
            message: 'Feedback submitted successfully',
        };
    }
}
