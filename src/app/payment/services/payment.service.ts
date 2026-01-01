import {
  BadRequestException,
  Injectable,
  UnauthorizedException, NotFoundException
} from '@nestjs/common';
import { Model, Types } from 'mongoose';

import { Order,OrderDocument } from '@common/db/schemas/order.schema';
import { Payment,PaymentDocument } from '@common/db/schemas/payment.schema';

import { InjectModel } from '@nestjs/mongoose';

import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(
    @InjectModel(Payment.name)
    private paymentModel: Model<Payment>,
    @InjectModel(Order.name)
    private orderModel: Model<Order>,
  ) {
    this.stripe = new Stripe(process.env['STRIPE_SECRET_KEY']!, {
      apiVersion: '2025-12-15.clover',
    });
  }

  // async createPaymentIntent(orderId: string) {
  //   const order = await this.orderModel.findById(orderId);

  //   if (!order || order.status !== 'PENDING_PAYMENT') {
  //     throw new BadRequestException('Invalid order');
  //   }

  //   const paymentIntent = await this.stripe.paymentIntents.create({
  //     amount: order.totalAmount * 100, // paise
  //     currency: 'inr',
  //     metadata: {
  //       orderId: order._id.toString(),
  //     },
  //   });

  //   await this.paymentModel.create({
  //     orderId: order._id,
  //     amount: order.totalAmount,
  //     stripePaymentIntentId: paymentIntent.id,
  //     status: 'INITIATED',
  //   });

  //   return {
  //     clientSecret: paymentIntent.client_secret,
  //     amount: order.totalAmount,
  //     currency: 'INR',
  //   };
  // }
  async createPaymentIntent(orderId: string) {
    const order = await this.orderModel.findById(orderId);
  
    if (!order) {
      throw new NotFoundException('Order not found');
    }
  
    if (order.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot create payment for order status ${order.status}`,
      );
    }
  
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(order.totalAmount * 100), // INR → paise
      currency: 'inr',
      automatic_payment_methods: { enabled: true },
      metadata: {
        orderId: order._id.toString(),
        learnerId: order.learnerId.toString(),
        instructorId: order.instructorId.toString(),
      },
    });
  
    await this.paymentModel.create({
      orderId: order._id,
      amount: order.totalAmount,
      stripePaymentIntentId: paymentIntent.id,
      status: 'INITIATED',
    });
  
    return {
      clientSecret: paymentIntent.client_secret,
      amount: order.totalAmount,
      currency: 'INR',
    };
  }
  
}

