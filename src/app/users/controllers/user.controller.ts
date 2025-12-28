import {
  Body,
  Controller,
  Get,
  Put,
  Post,
  Req,
  UnauthorizedException,
  
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UserService } from '../services/user.service';

import { RegisterUserDto } from '../dto/register-user.dto';
import { UpdateAdditionalInfoDto, UpdateInstructorProfileDto } from '@app/instructor/dto/update-instructor-profile.dto';
import { UpdateVehicleDetailsDto } from '../dto/vehicle-details.dto';
import { CustomRequest } from '@common/types/express';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { Public } from '@common/decorators/public.decorator';
import { ApiSecurity } from '@nestjs/swagger';
import { MoreProfile } from '../services/moreprofile.service';


@Controller('users/v1')
export class UserController {
  constructor(private userService: UserService,
    private instructorProfileModel: MoreProfile,
  ) {}
  

  @Public()
  @Post('register')
  register(@Body() dto: RegisterUserDto) {
    return this.userService.register(dto);
  }
  
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Req() req: any) {
    return this.userService.getProfile(req.user.id);
  }
  
  @UseGuards(JwtAuthGuard)

  @Put('me')
  updateProfile(@Req() req: any, @Body() dto: UpdateInstructorProfileDto) {
    return this.userService.findOneAndUpdateByEmail(req.user.email, dto);
  }
  
  @Put('additional-info')
  updateProfileAdditionalInfo(@Req() req: any, @Body() dto:UpdateAdditionalInfoDto) {
    return this.userService.findOneAndUpdateByAdditionalInfo(req.user.email, dto);
  }
  
  @UseGuards(JwtAuthGuard)
  @Get('get-more-profile')
getMoreProfile(@Req() user: any) {
  return this.userService.getMoreProfileDetails(user.publicId);
}

  

  @Put('vehicle-details')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  updateProfileVehicleDetails(
    @Req() req: Request & { user: { id: string } },
    @Body() dto: UpdateVehicleDetailsDto,
  ) {
    return this.userService.findOneAndUpdateByVehicleDetails(
      req.user.id,
      { vehicles: dto.vehicles }
    );
  }
}
  
  // @Get()
  // @UseGuards(JwtAuthGuard)
  // @ApiSecurity('jwt-auth')
  
  // async getMe(@Req() req: CustomRequest) {
  //   if (!req.user) {
  //     throw new UnauthorizedException('Token is invalid or expired');
  //   }
  //   const userId = req.user.publicId; // or whatever field you stored in JWT
  //   const user = await this.userService.getUserById(userId);
  //   return user;
  // }

