import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { CreateInstructorReviewDto } from '../dto/create-instructor-review.dto';
import { InstructorReviewService } from '../services/instructor-review.service';
import { JwtPayload } from '@interfaces/user.interface';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { Public } from '@common/decorators/public.decorator';
import { ReviewExistsDto } from '../dto/review-exists.dto';
import { Types } from 'mongoose';


@Controller('instructors/:instructorId/reviews')
export class InstructorReviewController {
  constructor(private readonly service: InstructorReviewService) {}

  @Public()
  @Get()
  getReviews(@Param('instructorId') instructorId: string) {
    return this.service.findByInstructor(instructorId);
  }
  @Public()
  @Get('summary')
  getSummary(@Param('instructorId') instructorId: Types.ObjectId) {
    return this.service.getSummary(instructorId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  createReview(
    @Param('instructorId') instructorId: string,
    @Body() dto: CreateInstructorReviewDto,
    @Req() @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.service.create({
      ...dto,
      instructorId,
    learnerId: currentUser.sub,
    });
  }
  
  @Get('status')
  async reviewStatus(
    @Param('instructorId') instructorId: string,
    @Query('orderId') orderId: string,
    @Query('slotId') slotId: string,
    @Req() @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.service.exists({
      instructorId,
      learnerId: currentUser.sub,
      orderId,
      slotId,
    });
  }
  
}