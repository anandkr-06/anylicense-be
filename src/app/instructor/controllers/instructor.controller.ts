import { Body, Controller, Get, Post } from '@nestjs/common';

import { InstructorService } from '../services/instructor.service';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtPayload } from '@interfaces/user.interface';
import {
  ChangePasswordDto,
  UpdateInstructorFinancialDto,
  UpdateInstructorProfileDto,
  UpdateInstructorVehicleDto,
} from '../dto/update-instructor-profile.dto';

@Controller('instructor/v1')
export class InstructorController {
  constructor(private instructorService: InstructorService) {}

  @Post('update')
  async updateProfile(
    @CurrentUser() currentUser: JwtPayload,
    @Body() payload: UpdateInstructorProfileDto,
  ) {
    const user = await this.instructorService.updateProfile(
      currentUser,
      payload,
    );
    return user;
  }

  @Post('update/vehicles')
  async updateVehicle(
    @CurrentUser() currentUser: JwtPayload,
    @Body() payload: UpdateInstructorVehicleDto,
  ) {
    const user = await this.instructorService.updateVehicle(
      currentUser,
      payload,
    );
    return user;
  }
  @Post('update/financial')
  async updateFinancialDetail(
    @CurrentUser() currentUser: JwtPayload,
    @Body() payload: UpdateInstructorFinancialDto,
  ) {
    const user = await this.instructorService.updateFinancial(
      currentUser,
      payload,
    );
    return user;
  }

  @Post('change-password')
  async changePassword(
    @CurrentUser() currentUser: JwtPayload,
    @Body() payload: ChangePasswordDto,
  ) {
    const user = await this.instructorService.changePassword(
      currentUser,
      payload,
    );
    return user;
  }

  @Get()
  async getMe(@CurrentUser() currentUser: JwtPayload) {
    const user = await this.instructorService.getProfile(currentUser);
    return user;
  }
}
