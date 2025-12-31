import {
    Body,
    Controller,
    Post,
    Req,
    UseGuards,
    Param
  } from '@nestjs/common';
  import { StripeService } from '../services/payment.service';
  import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
  
  @Controller('payments')
export class PaymentController {
  constructor(private readonly stripeService: StripeService) {}

  @Post('stripe/:orderId')
  async createStripePayment(
    @Param('orderId') orderId: string,
  ) {
    return this.stripeService.createPaymentIntent(orderId);
  }
}
