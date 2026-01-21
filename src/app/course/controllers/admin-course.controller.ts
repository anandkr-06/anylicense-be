import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { CourseService } from '../services/course.service';

// import { RolesGuard } from '../auth/roles.guard';
// import { Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@app/auth/roles.guard';
import { Roles } from '@app/auth/roles.decorator';

@Controller('admin/courses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminCourseController {
  constructor(private readonly courseService: CourseService) {}

  @Get('pending')
  getPendingCourses() {
    return this.courseService.getPendingCourses();
  }

  @Patch(':id/approve')
  approve(@Param('id') id: string) {
    return this.courseService.approveCourse(id);
  }

  @Patch(':id/reject')
  reject(
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.courseService.rejectCourse(id, reason);
  }
}
