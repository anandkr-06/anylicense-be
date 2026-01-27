import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { PublicCourseService } from '../services/public-course.service';
import { Public } from '@common/decorators/public.decorator';
import { CreateLeadDto } from '../dto/create-lead.dto';

@Controller('public/courses')
export class PublicCourseController {
  constructor(private readonly service: PublicCourseService) { }


  @Public()
  @Get()
  getCourses(@Query() query: any) {
    return this.service.getCourses(query);
  }

  @Public()
  @Post('leads')
  signup(@Body() dto: CreateLeadDto) {
    return this.service.createLead(dto);
  }

  @Public()
  @Get('filters')
  getFilters(@Query() query: any) {
    return this.service.getCourseFilters();
  }



}
