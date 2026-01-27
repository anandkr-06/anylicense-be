import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { CreateInstructorReviewDto } from '../dto/create-instructor-review.dto';
import { InstructorReviewService } from '../services/instructor-review.service';
import { JwtPayload } from '@interfaces/user.interface';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';


@Controller('instructors/:instructorId/reviews')
export class InstructorReviewController {
  constructor(private readonly service: InstructorReviewService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  createReview(
    @Param('instructorId') instructorId: string,
    @Body() dto: CreateInstructorReviewDto,
    @Req() @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.service.create({
      ...dto,
      instructorId,
    userId: currentUser.sub,
    });
  }

  @Get()
  getReviews(@Param('instructorId') instructorId: string) {
    return this.service.findByInstructor(instructorId);
  }

  @Get('summary')
  getSummary(@Param('instructorId') instructorId: string) {
    return this.service.getSummary(instructorId);
  }
}
