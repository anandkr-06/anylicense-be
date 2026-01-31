import { Body, Controller, Post, Req, Put, Get, Param, Res, Headers } from '@nestjs/common';
import { Public } from '@common/decorators/public.decorator';
import { LearnerService } from '../services/leaner.service';
import { SelfLeanerRegisterDto } from '../dto/self-learner-register.dto';
import { SomeOneLeanerRegisterDto } from '../dto/someone-else-register.dto';
import { LearnerLoginDto } from '../dto/learner-login.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { UpdateLearnerProfileDto } from '../dto/update-learner-profile.dto';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtPayload } from '@interfaces/user.interface';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { Response, Request } from 'express';
import { Types } from 'mongoose';



@Controller('learner')
export class LearnerController {
  constructor(private learnerService: LearnerService

  ) { }

  //Order history for learner

  @Get('orders')
  @UseGuards(JwtAuthGuard)
  getLearnerOrders(
    @Req() @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.learnerService.getOrdersForLearner(currentUser.sub);
  }

  @Get('orders/slots')
  getLearnerBookedSlots(
    @Req() @CurrentUser() currentUser: JwtPayload,
    // @Param('orderId') orderId: string,
  ) {
    return this.learnerService.getLearnerBookedSlots(currentUser.sub);
  }



@Public()
  @Post('register/self')
  async registerSelf(
    @Body() body: SelfLeanerRegisterDto,
    @Headers('x-referral-code') referralCode: string,
  ) {
    return this.learnerService.registerSelf(body, referralCode);
  }
  


  @Public()
  @Post('register/for-someone')
  async registerForSomeone(
    @Body() body: SomeOneLeanerRegisterDto, 
    @Headers('x-referral-code') referralCode: string,
  ) {
    return this.learnerService.registerSomeOne(body,referralCode);
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

  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.learnerService.forgotPassword(body.identifier);
  }

  @Public()
  @Post('reset-password')
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.learnerService.resetPassword(body);
  }

  // @Put('profile')
  //   async updateProfile(
  //     @Req() req: any,
  //     @Body() body: UpdateLearnerProfileDto,
  //   ) {
  //     return this.learnerService.updateProfile(req.user.userId, body);
  //   }
  @Put('profile')
  async updateProfile(@Req() req: any, @Body() body: UpdateLearnerProfileDto) {
    return this.learnerService.updateProfile(req.user.sub, body);
  }

  @Get('profile')
  async getProfile(@Req() req: any) {
    return this.learnerService.getProfile(req.user.sub);
  }


  @Get('ref/:code')
  async captureReferral(
    @Param('code') code: string,
    @Res() res: Response,
  ) {
    const learner = await this.learnerService.getReferal(code);


    if (learner) {
      res.cookie('referralCode', code, { maxAge: 7 * 24 * 60 * 60 * 1000 });
    }

    return res.redirect('/signup');
  }
  @Get('referrals/my')
  async myReferrals(@Req() @CurrentUser() currentUser: JwtPayload,) {
    return this.learnerService.getReferralsByReferrer(
      new Types.ObjectId(currentUser.sub),
    );
  }
  

}


