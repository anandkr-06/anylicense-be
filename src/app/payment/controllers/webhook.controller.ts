import {
  Controller,
  Post,
  Req,
  Headers,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import Stripe from 'stripe';
import { Request } from 'express';

import { Order, OrderDocument } from '@common/db/schemas/order.schema';
import { Payment, PaymentDocument } from '@common/db/schemas/payment.schema';
import { InstructorProfileDocument } from '@common/db/schemas/instructor-profile.schema';
import { LearnerDocument } from '@common/db/schemas/learner.schema';

@Controller('webhooks/stripe')
export class StripeWebhookController {
  private stripe = new Stripe(process.env['STRIPE_SECRET_KEY']!, {
    // apiVersion: '2024-06-20',
    apiVersion: '2025-12-15.clover',
  });

  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,

    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,

    @InjectModel('InstructorProfile')
    private readonly instructorProfileModel: Model<InstructorProfileDocument>,

    @InjectModel('Learner')
    private readonly learnerModel: Model<LearnerDocument>,
  ) {}

  private async unlockSlots(orderId: Types.ObjectId) {
    const order = await this.orderModel.findById(orderId);
    if (!order) return;

    const instructor = await this.instructorProfileModel.findById(
      order.instructorId,
    );
    if (!instructor) return;

    for (const week of instructor.availability.weeks) {
      for (const day of week.days) {
        for (const slot of day.slots) {
          if (slot.bookingId?.toString() === orderId.toString()) {
            slot.isBooked = false;
            slot.bookingId = undefined;
          }
        }
      }
    }

    await instructor.save();
  }

  @Post()
  async handleWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
  ) {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        req.body,
        signature,
        process.env['STRIPE_WEBHOOK_SECRET']!,
      );
    } catch (err) {
      //console.error('Webhook signature verification failed', err.message);
      return { received: false };
    }

    // ✅ PAYMENT SUCCESS
    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as Stripe.PaymentIntent;
      const orderId = intent.metadata['orderId'];

      // idempotency check
      const payment = await this.paymentModel.findOne({
        stripePaymentIntentId: intent.id,
      });

      if (payment?.status === 'SUCCESS') {
        return { received: true };
      }

      await this.paymentModel.findOneAndUpdate(
        { stripePaymentIntentId: intent.id },
        {
          status: 'SUCCESS',
          stripeChargeId: intent.latest_charge,
        },
      );

      await this.orderModel.findByIdAndUpdate(orderId, {
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
      });
    }

    // ❌ PAYMENT FAILED
    if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object as Stripe.PaymentIntent;
      const orderId = new Types.ObjectId(intent.metadata['orderId']);

      await this.paymentModel.findOneAndUpdate(
        { stripePaymentIntentId: intent.id },
        { status: 'FAILED' },
      );

      const order = await this.orderModel.findById(orderId);

      // 💰 REFUND WALLET IF USED
      if (order?.walletUsed && order.walletUsed > 0) {
        await this.learnerModel.findByIdAndUpdate(order.learnerId, {
          $inc: { walletBalance: order.walletUsed },
        });
      }

      await this.orderModel.findByIdAndUpdate(orderId, {
        status: 'CANCELLED',
        paymentStatus: 'FAILED',
      });

      await this.unlockSlots(orderId);
    }

    return { received: true };
  }
}
