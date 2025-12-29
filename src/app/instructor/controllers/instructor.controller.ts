import { Body, Controller, Get, Post,
  Patch,
  Param,
  Req,
  UseGuards,
  BadRequestException } from '@nestjs/common';

import { InstructorService } from '../services/instructor.service';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtPayload } from '@interfaces/user.interface';
import {
  ChangePasswordDto,
  UpdateInstructorFinancialDto,
  UpdateInstructorProfileDto,
  UpdateInstructorVehicleDto,
} from '../dto/update-instructor-profile.dto';

import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { UpdateVehicleDto } from '../dto/update-vehicle.dto';
import { UpdatePrivateVehicleDto } from '../dto/update-private-vehicle.dto';

import { UpdateFinancialDetailsDto } from '../dto/update-financial-details.dto';
import{UpdateDocumentsDto} from '../dto/update-documents.dto'
import {UpdateServiceAreasDto} from '../dto/update-service-areas.dto'
import {UpdateAvailabilityDto} from '../dto/update-availability.dto'

@Controller('instructor')
@UseGuards(JwtAuthGuard)
@Controller('instructor/v1')
export class InstructorController {
  constructor(private readonly instructorService: InstructorService) {}

  @Patch('availability')
updateAvailability(
  @Req() @CurrentUser() currentUser: JwtPayload,
  @Body() dto: UpdateAvailabilityDto
) {
  return this.instructorService.updateAvailability(
    currentUser.sub,
    dto
  );
}


  @Patch('service-areas')
async updateServiceAreas(
  @Req() @CurrentUser() currentUser: JwtPayload,
  @Body() dto: UpdateServiceAreasDto
) {
  return this.instructorService.updateServiceAreas(
    currentUser.sub,
    dto.serviceAreas
  );
}

  
  @Patch('documents')
async updateDocuments(
  @Req() @CurrentUser() currentUser: JwtPayload,
  @Body() dto: UpdateDocumentsDto
) {
  return this.instructorService.updateDocuments(
    currentUser.sub,
    dto
  );
}


  @Patch('financial-details')
  async updateFinancialDetails(
    @Req() @CurrentUser() currentUser: JwtPayload,
    @Body() dto: UpdateFinancialDetailsDto
  ) {
    return this.instructorService.updateFinancialDetails(
      currentUser.sub,
      dto
    );
  }
  
  // Update PRIVATE vehicle pricing
  @Patch('vehicle/private')
  async updatePrivateVehicle(
    @Req() @CurrentUser() currentUser: JwtPayload,
    @Body() dto: UpdatePrivateVehicleDto // ✅ MUST BE THIS
  ) {
    console.log('PRIVATE BODY DTO =>', dto);
    return this.instructorService.updatePrivateVehicle(
      currentUser.sub,
      dto
    );
  }

  @Patch('vehicle/:type')
  async updateVehicle(
    @Param('type') type: 'auto' | 'manual',
    @Req() @CurrentUser() currentUser: JwtPayload,
    @Body() dto: UpdateVehicleDto
  ) {
    if (!['auto', 'manual'].includes(type)) {
      throw new BadRequestException('Invalid vehicle type');
    }
    const userId = currentUser.sub;
    //throw new BadRequestException(`test user id ${userId}`);
    return this.instructorService.updateVehicle(
      userId,
      type,
      dto
    );
  }

  
  


  // ✅ Get vehicle info
  @Get('vehicle')
  async getVehicle(@Req() @Req() @CurrentUser() currentUser: JwtPayload,) {
    return this.instructorService.getVehicleDetails(currentUser.sub);
  }

  
  @Post('additional-info')
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
