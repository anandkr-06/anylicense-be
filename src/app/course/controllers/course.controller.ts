// course.controller.ts
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CourseService } from '../services/course.service';
import { CourseSignupDto } from '../dto/course-signup.dto';
import { CourseLoginDto } from '../dto/course-login.dto';
import { Public } from '@common/decorators/public.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CreateCourseDto } from '../dto/create-course.dto';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtPayload } from '@interfaces/user.interface';
import { CourseListDto } from '../dto/course-list.dto';
import { UpdateCourseDto } from '../dto/update-course.dto';

@Controller('course')
export class CourseController {
    constructor(private readonly courseService: CourseService) { }

    // 1️⃣ Signup
    @Public()
    @Post('signup')
    signup(@Body() dto: CourseSignupDto) {
        return this.courseService.signup(dto);
    }

    // 2️⃣ Login
    @Public()
    @Post('login')
    login(@Body() dto: CourseLoginDto) {
        return this.courseService.login(dto);
    }

    // @Public()
    @Post('add')
    @UseGuards(JwtAuthGuard)
    addCourse(
        @CurrentUser() currentUser: JwtPayload,
        @Body() dto: CreateCourseDto,
    ) {
        return this.courseService.addCourse(currentUser.sub, dto);
    }

    // 📄 List
  @Get('list')
  list(
    @CurrentUser() user: JwtPayload,
    @Query() query: CourseListDto,
  ) {
    return this.courseService.listCourses(user.sub, query);
  }

  // ✏️ Edit
  @Patch('action/:id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateCourseDto,
  ) {
    return this.courseService.updateCourse(user.sub, id, dto);
  }

  // 🗑 Soft delete
  @Delete('action/:id')
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.courseService.softDeleteCourse(user.sub, id);
  }

}
