import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { Public } from '@common/decorators/public.decorator';
import {
  commonSwaggerErrorResponses,
  commonSwaggerSuccess,
} from '@lib/swagger/swagger-decorator';
import { ApiBody, ApiSecurity } from '@nestjs/swagger';
import { InstructorLoginDto } from '@app/auth/dto/login.dto';
import {
  mockForgetPasswordResponse,
  mockLoginResponse,
  mockLogoutResponse,
  mockResetPasswordResponse,
} from '../mocks/login.mock';
import { ForgetPasswordDto } from '@app/auth/dto/forget-password.dto';
import { ResetPasswordDto } from '@app/auth/dto/reset-password.dto';
import { successResponse } from '@common/helpers/response.helper';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';

@Controller('auth/v1')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')

  public login(@Body() body: InstructorLoginDto) {
    return this.authService.login(body.identifier, body.password);
  }

  @Public()
  @Post('forgot-password')
  public forgetpassword(@Body() body: ForgetPasswordDto) {
    return this.authService.forgetpassword(body.email);
  }

  @Public()
  @Post('reset-password')
  public resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.token, body.newPassword);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  public logout() {
    return successResponse({}, 'Working on Logout');
  }
}
