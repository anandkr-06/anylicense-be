import { Body, Controller, Post, Req } from '@nestjs/common';
import { Public } from '@common/decorators/public.decorator';
import { LearnerService } from '../services/leaner.service';
import { SelfLeanerRegisterDto } from '../dto/self-learner-register.dto';
import { SomeOneLeanerRegisterDto } from '../dto/someone-else-register.dto';
import { LearnerLoginDto } from '../dto/learner-login.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';

@Controller('learner')
export class LearnerController {
  constructor(private learnerService: LearnerService) {}

  @Public()
  @Post('register/self')
  async registerSelf(@Body() body: SelfLeanerRegisterDto) {
    return this.learnerService.registerSelf(body);
  }

  @Public()
  @Post('register/for-someone')
  async registerForSomeone(@Body() body: SomeOneLeanerRegisterDto) {
    return this.learnerService.registerSomeOne(body);
  }

  @Public()
  @Post('login')
  async login(@Body() body: LearnerLoginDto) {
    return this.learnerService.login(
      body.identifier,
      body.password,
    );
  }
  
  @Post('change-password')
  async changePassword(
    @Req() req: any,
    @Body() body: ChangePasswordDto,
  ) {
    const learnerId = req.user.sub; // from JWT payload
    return this.learnerService.changePassword(learnerId, body);
  }
}