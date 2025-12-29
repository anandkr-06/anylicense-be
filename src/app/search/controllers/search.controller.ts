import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Get
} from '@nestjs/common';

import { Public } from '@common/decorators/public.decorator';
import { InstructorSearchDto } from '../dto/search.dto';
import { SearchService } from '../services/search.service';
//import {SearchInstructorDto} from '../dto/search-instructor.dto'

@Controller('search/v1')
export class SearchController {
  constructor(private searchService: SearchService) {}

//   @Public()
//   @Get("search")
//   search(@Query() dto: SearchInstructorDto) {
//   return this.instructorService.searchInstructors(dto);
// }

  @Public()
  @Post('instructor')
  @HttpCode(HttpStatus.OK)
  async getAll(@Body() payload: InstructorSearchDto) {
    return this.searchService.getAll(payload);
  }

  @Public()
  @Post('instructor/:instructorId/slot')
  async list(@Param('instructorId') instructorId: string) {
    return this.searchService.getInstructorSlots(instructorId);
  }
  @Public()
  @Post('instructor/get/:id')
  @HttpCode(HttpStatus.OK)
  async get(@Param('id') instructorId: string) {
    return this.searchService.getInstructor(instructorId);
  }
}
