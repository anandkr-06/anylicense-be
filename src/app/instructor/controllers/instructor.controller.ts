import { Body, Controller, Get, Post,
  Patch,
  Param,
  Req,
  UseGuards, Put,
  BadRequestException, 
  Query} from '@nestjs/common';

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
import { AvailabilityWeekDto } from '../dto/week.dto';
import  {CreateAvailabilityWeekDto} from '../dto/create-availability-week.dto'
import {CheckAvailabilityDto} from '../dto/check-availability.dto'
import { Public } from '@common/decorators/public.decorator';
@Controller('instructor')
@UseGuards(JwtAuthGuard)
//@Controller('instructor/v1')
export class InstructorController {
  constructor(private readonly instructorService: InstructorService) {}

  @Get('orders')
  getInstructorOrders(
    @Req() @CurrentUser() currentUser: JwtPayload
  ) {
    return this.instructorService.getOrdersForInstructor(currentUser.sub);
  }
  @Get('booked-slots')
  getInstructorBookedSlots(
    @Req() @CurrentUser() currentUser: JwtPayload
  ) {
    return this.instructorService.getOrdersForInstructor(currentUser.sub);
  }
  
@Public()
@Get(':instructorId/available-slots')
getAvailableSlots(
  @Param('instructorId') instructorId: string,
  @Query('timeOfDay') timeOfDay?: 'AM' | 'PM',
) {
  return this.instructorService.getAvailableSlots(
    instructorId,
    timeOfDay,
  );
}



  @Public()
  @Post(':instructorId/check-availability')
  checkAvailability(
    @Param('instructorId') instructorId: string,
    @Body() dto: CheckAvailabilityDto,
  ) {
    return this.instructorService.checkAvailability(instructorId, dto);
  }

 @Post('availability/week')
 addWeek(
  @Req() @CurrentUser() currentUser: JwtPayload,
   @Body() body: { startDate: string; endDate: string, days: any[] }
 ) {
   return this.instructorService.appendWeek(
    currentUser.sub,
     body
   );
 }

 // 2️⃣ Update whole week
 @Patch('availability/week/:weekId')
 updateWeek(
  @Req() @CurrentUser() currentUser: JwtPayload,
   @Param('weekId') weekId: string,
   @Body() body: AvailabilityWeekDto
 ) {
   return this.instructorService.updateWeek(
    currentUser.sub,
     weekId,
     body
   );
 }

//  3️⃣ Update slots for a single day
 @Patch('availability/week/:weekId/day')
 updateDaySlots(
  @Req() @CurrentUser() currentUser: JwtPayload,
   @Param('weekId') weekId: string,
   @Body() body: { date: string; slots: any[] }
 ) {
   return this.instructorService.updateDaySlots(
    currentUser.sub,
     weekId,
     body
   );
 }

 // 4️⃣ Get availability
 @Get('availability')
 getAvailability(@Req() @CurrentUser() currentUser: JwtPayload) {
   return this.instructorService.getAvailability(currentUser.sub);
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
