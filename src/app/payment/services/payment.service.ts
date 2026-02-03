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

  // ✅ ONLY for PUBLIC orders
  learnerId?: string;

  instructorId?: string;

  // ✅ Used to branch in webhook
  orderType?: 'PUBLIC' | 'PRIVATE';
};


@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,

    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel('PrivateOrder')
    private readonly privateOrderModel: Model<any>,
  ) {
    this.stripe = new Stripe(process.env['STRIPE_SECRET_KEY']!, {
      apiVersion: '2025-12-15.clover',
    });
  }

  /* -----------------------------
     CREATE ORDER PAYMENT INTENT
  ------------------------------ */
  async createOrderPaymentIntent(
    orderId: string,
    orderType: 'PUBLIC' | 'PRIVATE' = 'PUBLIC',
  ) {
    // 1️⃣ Load order based on type
    const order =
      orderType === 'PUBLIC'
        ? await this.orderModel.findById(orderId)
        : await this.privateOrderModel.findById(orderId);
  
    if (!order) {
      throw new NotFoundException('Order not found');
    }
  
    if (order.status !== 'PENDING_PAYMENT') {
      throw new BadRequestException(
        `Cannot create payment for order status ${order.status}`,
      );
    }
  
    // 2️⃣ Build metadata (IMPORTANT PART)
    const metadata: StripeIntentMetadata =
  orderType === 'PUBLIC'
    ? {
        purpose: 'ORDER_PAYMENT',
        orderId: order._id.toString(),
        learnerId: order.learnerId.toString(),
        instructorId: order.instructorId.toString(),
        orderType: 'PUBLIC',
      }
    : {
        purpose: 'ORDER_PAYMENT',
        orderId: order._id.toString(),
        orderType: 'PRIVATE',
      };
  
    // 3️⃣ Create Stripe PaymentIntent
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(order.totalAmount * 100), // cents
      currency: 'AUD',
      automatic_payment_methods: { enabled: true },
      metadata,
    });
  
    // 4️⃣ Save payment record
    await this.paymentModel.create({
      orderId: order._id,
      orderType, // 🔥 useful for webhook/debug
      amount: Math.round(order.totalAmount * 100),
      stripePaymentIntentId: paymentIntent.id,
      status: 'INITIATED',
    });
  
    // 5️⃣ Return to frontend
    return {
      clientSecret: paymentIntent.client_secret,
      amount: Math.round(order.totalAmount * 100),
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
