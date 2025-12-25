import { Body, Controller, Post } from '@nestjs/common';
import { Public } from '@common/decorators/public.decorator';
import { LearnerService } from '../services/leaner.service';
import { SelfLeanerRegisterDto } from '../dto/self-learner-register.dto';
import { SomeOneLeanerRegisterDto } from '../dto/someone-else-register.dto';
import { LearnerLoginDto } from '../dto/learner-login.dto';

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
}

