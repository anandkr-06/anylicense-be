import {
  Body,
  Controller,
  Get,
  Put,
  Post,
  Req,
  UnauthorizedException,
  
  UseGuards,
  
} from '@nestjs/common';
import { UserService } from '../services/user.service';
import { RegisterUserDto } from '../dto/register-user.dto';
import { UpdateInstructorProfileDto } from '@app/instructor/dto/update-instructor-profile.dto';
import { CustomRequest } from '@common/types/express';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { Public } from '@common/decorators/public.decorator';
import { ApiSecurity } from '@nestjs/swagger';


@Controller('users/v1')
export class UserController {
  constructor(private userService: UserService) {}

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
}
