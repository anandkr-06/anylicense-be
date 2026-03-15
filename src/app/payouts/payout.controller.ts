import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { PayoutService } from './payout.service'
import { Public } from '@common/decorators/public.decorator';
import { JwtPayload } from '@interfaces/user.interface';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { WithdrawDto } from '@app/payment/dto/withdraw.dto';
import { StripeService } from './stripe.service';

@Controller('payouts')
export class PayoutController {
  constructor(private readonly payoutService: PayoutService,
    private readonly stripeService: StripeService
  ) {}
@Public()
  @Post('run-weekly')
  async runWeeklyPayout() {
    return this.payoutService.generateWeeklyPayout();
  }

  // @Post('fast-cash')
  // async fastCash(
  //   @CurrentUser() currentUser: JwtPayload,
  //   @Body() withdrawDto: WithdrawDto,
  // ) {
  //   const instructor = currentUser.sub; // from JWT

  //   return this.payoutService.instructorFastCash(instructor,withdrawDto.amount);
  // }

  @Post('fast-cash')
async fastCash(
  @CurrentUser() currentUser: JwtPayload,
  @Body('amount') amount: number,
) {
  const instructorId = currentUser.sub;

  return this.payoutService.instructorFastCash(
    instructorId,
    amount,
  );
}

@Post('add-wallet')
addWallet(
  @CurrentUser() currentUser: JwtPayload,
  @Body('amount') amount: number,
) {
  return this.payoutService.addWalletBalance(currentUser.sub, amount);
}


  @Get('instructor-transactions')
  async getTransactions(
    @CurrentUser() currentUser: JwtPayload,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const instructorId = currentUser.sub;

    return this.payoutService.getTransactions(
      instructorId,
      Number(page),
      Number(limit),
      startDate,
      endDate,
    );
  }


  @Get('wallet-balance')
  async getPayoutHistory(
    @CurrentUser() currentUser: JwtPayload,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const instructorId = currentUser.sub;
    

    return this.payoutService.getInstructorWalletHistory(
      instructorId,
      Number(page),
      Number(limit),
      startDate,
      endDate,
    );
  }

  @Post('test-charge')
async createTestCharge() {
  return this.stripeService.createTestCharge();
}

  @Post('test-topup')
async createTestTopup() {
  return this.stripeService.addTestBalance();
}



}