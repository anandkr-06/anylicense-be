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
import { InstructorProfileDocument, InstructorProfile } from '@common/db/schemas/instructor-profile.schema';
import { LearnerDocument } from '@common/db/schemas/learner.schema';
import { Public } from '@common/decorators/public.decorator';

import { WalletService } from '@app/wallet/services/wallet.service';
import { WalletTxnSource } from '@common/db/schemas/wallet-transaction.schema';

@Public()
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
    
    @InjectModel(InstructorProfile.name)
    private instructorProfileModel: Model<InstructorProfileDocument>,
    @InjectModel('Learner')
    private readonly learnerModel: Model<LearnerDocument>,
    
    private readonly walletService: WalletService, // ✅ correct
    
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

 

//   @Post()
// async handleWebhook(
//   @Req() req: Request,
//   @Headers('stripe-signature') signature: string,
// ) {
//   //const stripe = new Stripe(process.env['STRIPE_SECRET_KEY']!); // ✅ no apiVersion
//   const stripe = new Stripe(process.env['STRIPE_SECRET_KEY']!, {
//     // apiVersion: '2024-06-20',
//     apiVersion: '2025-12-15.clover',
//   });

//   const event = stripe.webhooks.constructEvent(
//     req.body, // MUST be raw buffer
//     signature,
//     process.env['STRIPE_WEBHOOK_SECRET']!,
//   );

//   if (event.type === 'payment_intent.succeeded') {
//     const intent = event.data.object as Stripe.PaymentIntent;

//     await this.paymentModel.findOneAndUpdate(
//       { stripePaymentIntentId: intent.id },
//       {
//         status: 'SUCCESS',
//         stripeChargeId: intent.latest_charge,
//       },
//     );

//     await this.orderModel.findByIdAndUpdate(
//       intent.metadata['orderId'],
//       { status: 'CONFIRMED' },
//     );
//   }

//   if (event.type === 'payment_intent.payment_failed') {
//     const intent = event.data.object as Stripe.PaymentIntent;

//     await this.paymentModel.findOneAndUpdate(
//       { stripePaymentIntentId: intent.id },
//       { status: 'FAILED' },
//     );

//     await this.orderModel.findByIdAndUpdate(
//       intent.metadata['orderId'],
//       { status: 'CANCELLED' },
//     );
    
    
//     await this.unlockSlots(new Types.ObjectId(intent.metadata['orderId']));
//   }
  
//   return { received: true };
// }

@Post()
async handleWebhook(
  @Req() req: Request,
  @Headers('stripe-signature') signature: string,
) {
  const event = this.stripe.webhooks.constructEvent(
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

    await this.unlockSlots(new Types.ObjectId(intent.metadata['orderId']));
  }

  // ✅ ADD THIS BLOCK
  if (event.type === 'charge.refunded') {
    const charge = event.data.object as Stripe.Charge;

    const payment = await this.paymentModel.findOne({
      stripeChargeId: charge.id,
    });
    if (!payment) return { received: true };

    const order = await this.orderModel.findById(payment.orderId);
    if (!order || !order.walletUsed || order.walletUsed <= 0) {
      return { received: true };
    }

    // ✅ THIS IS THE ONLY PLACE YOU CALL WALLET
    await this.walletService.creditWallet(
      order.learnerId,
      order.walletUsed,
      WalletTxnSource.STRIPE_REFUND,
      order._id,
      `stripe-refund-${event.id}`,
    );

    await this.orderModel.findByIdAndUpdate(order._id, {
      status: 'REFUNDED',
    });

    await this.unlockSlots(order._id);
  }

  return { received: true };
}



}
