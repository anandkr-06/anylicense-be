import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';

import { LeanerSlotService } from '../services/leaner.slot.service';

@Controller('leaner/v1')
@UseGuards(JwtAuthGuard)
export class LeanerSlotController {
  constructor(private readonly leanerSlotService: LeanerSlotService) {}

  @Post('instructor/:instructorId')
  async list() {
    return {
      message: 'Api Move to public',
    };
    // return this.leanerSlotService.getInstructorSlots(currentUser, instructorId);
  }
}
