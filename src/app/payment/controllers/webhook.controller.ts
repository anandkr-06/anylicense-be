import {
    Body,
    Controller,
    Post,
    Req,
    UseGuards,
    Param,
    Headers
    
    
  } from '@nestjs/common';
  

  import { Model } from 'mongoose';
  import { Order } from '@common/db/schemas/order.schema'; 
  import { Payment } from '@common/db/schemas/payment.schema'; 
  import { StripeService } from '../services/payment.service';
  import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
  import Stripe from 'stripe';
  import { Request } from 'express';


@Controller('webhooks/stripe')
export class StripeWebhookController {
  constructor(
    private readonly orderModel: Model<Order>,
    private readonly paymentModel: Model<Payment>,
  ) {}

  @Post()
  async handleWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
  ) {
    const stripe = new Stripe(process.env['STRIPE_SECRET_KEY']!, {
      apiVersion: '2025-12-15.clover',
    });

    const event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env['STRIPE_WEBHOOK_SECRET']!,
    );
    

    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as Stripe.PaymentIntent;

      await this.paymentModel.findOneAndUpdate(
        { stripePaymentIntentId: intent.id },
        {
          status: 'SUCCESS',
          stripeChargeId: intent.latest_charge,
        },
      );

      await this.orderModel.findByIdAndUpdate(
        intent.metadata['orderId'],
        { status: 'CONFIRMED' },
      );
    }

    if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object as Stripe.PaymentIntent;

      await this.paymentModel.findOneAndUpdate(
        { stripePaymentIntentId: intent.id },
        { status: 'FAILED' },
      );

      await this.orderModel.findByIdAndUpdate(
        intent.metadata['orderId'],
        { status: 'CANCELLED' },
      );
    }

    return { received: true };
  }
}
