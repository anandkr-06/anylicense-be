import { Body, Controller, Post, Param, BadRequestException, Query } from '@nestjs/common';
import { StripeService } from '../services/payment.service';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtPayload } from '@interfaces/user.interface';

@Controller('payments')
export class PaymentController {
  constructor(private readonly stripeService: StripeService) {}

  /* ---------------------------------
     ORDER PAYMENT
  ---------------------------------- */
  // @Post('stripe/:orderId')
  // async createStripePayment(@Param('orderId') orderId: string) {
  //   if (!orderId) {
  //     throw new BadRequestException('Order ID is required');
  //   }
  //   return this.stripeService.createOrderPaymentIntent(orderId);
  // }
  @Post('stripe/:orderId')
async createStripePayment(
  @Param('orderId') orderId: string,
  @Query('type') type?: 'PUBLIC' | 'PRIVATE',
) {
  if (!orderId) {
    throw new BadRequestException('Order ID is required');
  }

  // 🔥 default PUBLIC → backward compatible
  return this.stripeService.createOrderPaymentIntent(orderId, type ?? 'PUBLIC');
}


  /* ---------------------------------
     WALLET TOP-UP
     Body: { learnerId: string, amount: number }
  ---------------------------------- */
  @Post('wallet/topup')
  async createWalletTopup(
   @CurrentUser() currentUser: JwtPayload,
    @Body('amount') amount: number,
  ) {
    const learnerId = currentUser.sub;
    if (!learnerId || !amount || amount <= 0) {
      throw new BadRequestException('Learner ID and valid amount are required');
    }

    return this.stripeService.createWalletTopupIntent(learnerId, amount);
  }
}
