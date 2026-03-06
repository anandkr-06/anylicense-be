import { Body, Controller, Post } from '@nestjs/common';
import { PayoutService } from './payout.service'
import { Public } from '@common/decorators/public.decorator';
import { JwtPayload } from '@interfaces/user.interface';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { WithdrawDto } from '@app/payment/dto/withdraw.dto';

@Controller('payouts')
export class PayoutController {
  constructor(private readonly payoutService: PayoutService) {}
@Public()
  @Post('run-weekly')
  async runWeeklyPayout() {
    return this.payoutService.generateWeeklyPayout();
  }

  @Post('fast-cash')
  async fastCash(
    @CurrentUser() currentUser: JwtPayload,
    @Body() withdrawDto: WithdrawDto,
  ) {
    const instructor = currentUser.sub; // from JWT

    return this.payoutService.instructorFastCash(instructor,withdrawDto.amount);
  }
}