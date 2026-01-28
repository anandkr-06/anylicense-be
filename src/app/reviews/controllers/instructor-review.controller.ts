import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { CreateInstructorReviewDto } from '../dto/create-instructor-review.dto';
import { InstructorReviewService } from '../services/instructor-review.service';
import { JwtPayload } from '@interfaces/user.interface';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { Public } from '@common/decorators/public.decorator';


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
  getSummary(@Param('instructorId') instructorId: string) {
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
    userId: currentUser.sub,
    });
  }
  
}
