import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import Stripe from 'stripe';

import { Order, OrderDocument } from '@common/db/schemas/order.schema';
import { Payment, PaymentDocument } from '@common/db/schemas/payment.schema';

export type StripeIntentMetadata = {
  purpose: 'ORDER_PAYMENT' | 'WALLET_TOPUP';
  orderId?: string;
  learnerId: string;
  instructorId?: string;
};

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,

    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
  ) {
    this.stripe = new Stripe(process.env['STRIPE_SECRET_KEY']!, {
      apiVersion: '2025-12-15.clover',
    });
  }

  /* -----------------------------
     CREATE ORDER PAYMENT INTENT
  ------------------------------ */
  async createOrderPaymentIntent(orderId: string) {
    const order = await this.orderModel.findById(orderId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== 'PENDING_PAYMENT') {
      throw new BadRequestException(
        `Cannot create payment for order status ${order.status}`,
      );
    }

    const metadata: StripeIntentMetadata = {
      purpose: 'ORDER_PAYMENT',
      orderId: order._id.toString(),
      learnerId: order.learnerId.toString(),
      instructorId: order.instructorId.toString(),
    };

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(order.totalAmount * 100), // Convert to cents
      currency: 'AUD',
      automatic_payment_methods: { enabled: true },
      metadata,
    });

    await this.paymentModel.create({
      orderId: order._id,
      amount: Math.round(order.totalAmount * 100),
      stripePaymentIntentId: paymentIntent.id,
      status: 'INITIATED',
    });

    return {
      clientSecret: paymentIntent.client_secret,
      amount: order.totalAmount,
      currency: 'AUD',
      metadata,
    };
  }

  /* -----------------------------
     CREATE WALLET TOP-UP INTENT
  ------------------------------ */
  async createWalletTopupIntent(learnerId: string, amount: number) {
    if (amount <= 0) {
      throw new BadRequestException('Invalid amount');
    }

    const metadata: StripeIntentMetadata = {
      purpose: 'WALLET_TOPUP',
      learnerId,
    };

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'AUD',
      automatic_payment_methods: { enabled: true },
      metadata,
    });

    return {
      clientSecret: paymentIntent.client_secret,
      amount,
      currency: 'AUD',
      metadata,
    };
  }
}
