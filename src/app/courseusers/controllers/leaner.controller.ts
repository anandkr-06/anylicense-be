import { Body, Controller, Post } from '@nestjs/common';
import { Public } from '@common/decorators/public.decorator';

import { LeanerService } from '../services/leaner.service';
import {
  SelfLeanerRegisterDto,
  SomeOneLeanerRegisterDto,
} from '../dto/leaner.dto';

@Controller('leaner/v1')
export class LearnerController {
  constructor(private userService: LeanerService) {}

  @Public()
  @Post('register/self')
  async register(@Body() body: SelfLeanerRegisterDto) {
    const payload = body;
    return this.userService.registerSelf(payload);
  }
  @Public()
  @Post('register/for-someone')
  async registerSomeElse(@Body() body: SomeOneLeanerRegisterDto) {
    const payload = body;
    return this.userService.registerSomeOne(payload);
  }
}
