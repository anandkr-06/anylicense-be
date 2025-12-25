import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { JwtPayload } from '@interfaces/user.interface';
import { CurrentUser } from '@common/decorators/current-user.decorator';

import { CreateMultipleSlotDto, CreateSlotDto } from '../dto/create-slot.dto';
import { InstructorSlotService } from '../services/instructor.slot.service';
import {
  DeleteSlotStatusDto,
  UpdateSlotDto,
  UpdateSlotStatusDto,
} from '../dto/update-slot.dto';

@Controller('instructor/v1/slot')
@UseGuards(JwtAuthGuard)
export class InstructorSlotController {
  constructor(private readonly instructorSlotService: InstructorSlotService) {}

  @Post('create')
  @UseGuards(JwtAuthGuard)
  async create(
    @CurrentUser() currentUser: JwtPayload,
    @Body() dto: CreateSlotDto,
  ) {
    const instructorId = currentUser.publicId;
    return this.instructorSlotService.createSlot(instructorId, dto);
  }

  @Post('create-mulitple')
  @UseGuards(JwtAuthGuard)
  async createMultiple(
    @CurrentUser() currentUser: JwtPayload,
    @Body() dto: CreateMultipleSlotDto,
  ) {
    const instructorId = currentUser.publicId;
    return this.instructorSlotService.createMultipleSlot(instructorId, dto);
  }

  @Post('get')
  @UseGuards(JwtAuthGuard)
  async list(@CurrentUser() currentUser: JwtPayload) {
    const instructorId = currentUser.publicId;
    return this.instructorSlotService.getSlots(instructorId);
  }

  @Post('update')
  async update(
    @CurrentUser() currentUser: JwtPayload,
    @Body() dto: UpdateSlotDto,
  ) {
    return this.instructorSlotService.updateSlot(currentUser, dto);
  }

  @Post('status')
  async updateStatus(
    @CurrentUser() currentUser: JwtPayload,
    @Body() dto: UpdateSlotStatusDto,
  ) {
    return this.instructorSlotService.updateSlotStatus(currentUser, dto);
  }
  @Post('delete')
  async deleteSlot(
    @CurrentUser() currentUser: JwtPayload,
    @Body() dto: DeleteSlotStatusDto,
  ) {
    return this.instructorSlotService.deleteSlot(currentUser, dto);
  }
}
