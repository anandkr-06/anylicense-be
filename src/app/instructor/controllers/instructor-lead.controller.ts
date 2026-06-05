import { Body, Controller, Post } from '@nestjs/common';
import { InstructorLeadService } from '@app/instructor/services/instructor-lead.service';
import { CreateInstructorLeadDto } from '@app/instructor/dto/create-instructor-lead.dto';
import { Public } from '@common/decorators/public.decorator';

@Controller('instructor-leads')
export class InstructorLeadController {
  constructor(
    private readonly instructorLeadService: InstructorLeadService,
  ) {}

  @Post()
  @Public()
  async create(
    @Body() payload: CreateInstructorLeadDto,
  ) {
    return this.instructorLeadService.create(payload);
  }
}