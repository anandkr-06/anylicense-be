import { Body, Controller, Post, Param, BadRequestException, Query, Get } from '@nestjs/common';
import { StripeService } from '../services/payment.service';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtPayload } from '@interfaces/user.interface';
import { Public } from '@common/decorators/public.decorator';
import { WithdrawDto } from '../dto/withdraw.dto';


@Controller('payments')
export class PaymentController {
  constructor(private readonly stripeService: StripeService,
    

  ) {}

  /* ---------------------------------
     ORDER PAYMENT (PUBLIC / PRIVATE)
  ---------------------------------- */
  @Post('stripe/:orderId')
  async createStripePayment(
    @Param('orderId') orderId: string,
    @Query('type') type?: 'PUBLIC' | 'PRIVATE',
  ) {
    if (!orderId) {
      throw new BadRequestException('Order ID is required');
    }

    return this.stripeService.createOrderPaymentIntent(
      orderId,
      type ?? 'PUBLIC',
    );
  }

  /* ---------------------------------
     WALLET TOP-UP (AUTH REQUIRED)
  ---------------------------------- */
  @Post('wallet/topup')
  async createWalletTopup(
    @CurrentUser() currentUser: JwtPayload,
    @Body('amount') amount: number,
  ) {
    const learnerId = currentUser.sub;

    if (!learnerId || !amount || amount <= 0) {
      throw new BadRequestException('Valid amount is required');
    }

    return this.stripeService.createWalletTopupIntent(learnerId, amount);
  }

  /* ---------------------------------
     🎁 GIFT VOUCHER PAYMENT (PUBLIC)
  ---------------------------------- */
  @Public()
  @Post('stripe/gift-voucher/:giftVoucherId')
  async createGiftVoucherPayment(
    @Param('giftVoucherId') giftVoucherId: string,
  ) {
    if (!giftVoucherId) {
      throw new BadRequestException('Gift voucher ID is required');
    }

    return this.stripeService.createGiftVoucherPaymentIntent(giftVoucherId);
  }

  @Post('withdraw')
  async withdraw(
    @CurrentUser() currentUser: JwtPayload,
    @Body() withdrawDto: WithdrawDto,
  ) {
    const learnerId = currentUser.sub; // from JWT

    return this.stripeService.requestWithdrawToCard(
      learnerId,
      withdrawDto.amount,
      withdrawDto.stripePaymentIntentId,
      withdrawDto.source
    );
  }

  @Get('accounts')
  async sourceAccounts(
    @CurrentUser() currentUser: JwtPayload,
    @Body() withdrawDto: WithdrawDto,
  ) {
    const learnerId = currentUser.sub; // from JWT

    return this.stripeService.creditedAccounts(
      learnerId
    );
  }
}
