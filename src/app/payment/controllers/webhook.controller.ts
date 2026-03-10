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
import {
  InstructorProfile,
  InstructorProfileDocument,
} from '@common/db/schemas/instructor-profile.schema';
import { Learner, LearnerDocument } from '@common/db/schemas/learner.schema';

import { WalletService } from '@app/wallet/services/wallet.service';
import { WalletTxnSource } from '@common/db/schemas/wallet-transaction.schema';
import { StripeIntentMetadata, StripeCardMeta } from '@common/stripe/stripe.types';
import { Public } from '@common/decorators/public.decorator';
import { ReferralService } from '../services/referral.service';
import { PrivateOrderDocument } from '@common/db/schemas/private-order.schema';
import { GiftVoucherService } from '@app/gift-vouchers/services/gift-voucher-service';

@Public()
@Controller('webhooks/stripe')
export class StripeWebhookController {
  private stripe = new Stripe(process.env['STRIPE_SECRET_KEY']!, {
    //apiVersion: '2024-06-20',
    apiVersion: '2025-12-15.clover',
  });

  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,

    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,

    @InjectModel(InstructorProfile.name)
    private readonly instructorProfileModel: Model<InstructorProfileDocument>,

    @InjectModel(Learner.name)
    private readonly learnerModel: Model<LearnerDocument>,

    @InjectModel('PrivateOrder')
    private readonly privateOrderModel: Model<PrivateOrderDocument>,

    private readonly walletService: WalletService,
    private readonly referralService: ReferralService,
    private readonly giftVoucherService: GiftVoucherService,
  ) { }

  /* -------------------------------------------
     UNLOCK SLOTS
  -------------------------------------------- */
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

  /* -------------------------------------------
     STRIPE WEBHOOK
  -------------------------------------------- */
  @Post()
  async handleWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
  ) {
    let event: Stripe.Event;
    const sig = req.headers['stripe-signature'];
    console.log("sig=",sig)
    console.log("signature=",sig)
console.log("webhook",process.env['STRIPE_WEBHOOK_SECRET']);
    try {

      const rawBody = (req as any).rawBody;

      console.log("IsBuffer:", Buffer.isBuffer(rawBody));
      
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env['STRIPE_WEBHOOK_SECRET']!,
      );

} catch (err) {
  console.error('❌ Stripe signature verification failed:', err);
  return { received: false };
}
  
    console.log('✅ Stripe Event:', event.type);

    /* -------------------------------------------
       PAYMENT SUCCESS
    -------------------------------------------- */
    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as Stripe.PaymentIntent;
      const metadata = intent.metadata as StripeIntentMetadata;

      await this.paymentModel.findOneAndUpdate(
        { stripePaymentIntentId: intent.id },
        {
          status: 'SUCCESS',
          stripeChargeId: intent.latest_charge,
        },
      );

      if (!intent.latest_charge) return { received: true };

      // ✅ Retrieve charge ONCE
      const charge = await this.stripe.charges.retrieve(
        intent.latest_charge as string,
      );
      const card = charge.payment_method_details?.card;

      const cardMeta: StripeCardMeta = {
        brand: card?.brand ?? undefined,
        last4: card?.last4 ?? undefined,
        expMonth: card?.exp_month ?? undefined,
        expYear: card?.exp_year ?? undefined,
        paymentIntentId: intent.id,
        chargeId: charge.id,
      };

      /* -------- WALLET TOP-UP -------- */
      if (metadata.purpose === 'WALLET_TOPUP' && metadata.learnerId) {
        await this.walletService.creditWallet(
          new Types.ObjectId(metadata.learnerId),
          intent.amount_received / 100,
          WalletTxnSource.STRIPE,
          null,
          intent.id,
          cardMeta,
        );

        return { received: true };
      }

      /* -------- ORDER PAYMENT -------- */
      /* -------- ORDER PAYMENT -------- */
      if (
        metadata.purpose === 'ORDER_PAYMENT' &&
        metadata.orderId
      ) {
        const orderType = metadata.orderType ?? 'PUBLIC';

        if (orderType === 'PUBLIC' && metadata.learnerId) {
          await this.handlePublicOrderSuccess(intent, metadata, cardMeta);
          return { received: true };
        }

        if (orderType === 'PRIVATE') {
          await this.handlePrivateOrderSuccess(intent, metadata);
          return { received: true };
        }
      }

      /* -------- GIFT VOUCHER PAYMENT -------- */
      if (
        metadata.purpose === 'GIFT_VOUCHER' &&
        metadata.giftVoucherId
      ) {
        await this.giftVoucherService.activateVoucher(
          metadata.giftVoucherId,
          intent.id,
        );
        
        return { received: true };
      }



    }




    /* -------------------------------------------
       PAYMENT FAILED
    -------------------------------------------- */
    if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object as Stripe.PaymentIntent;
      const metadata = intent.metadata as StripeIntentMetadata;

      await this.paymentModel.findOneAndUpdate(
        { stripePaymentIntentId: intent.id },
        { status: 'FAILED' },
      );

      if (metadata.orderId) {
        const orderType = metadata.orderType ?? 'PUBLIC';
        const orderId = new Types.ObjectId(metadata.orderId);

        if (orderType === 'PUBLIC') {
          await this.orderModel.findByIdAndUpdate(orderId, { status: 'CANCELLED' });
          await this.unlockSlots(orderId);
        }

        if (orderType === 'PRIVATE') {
          await this.privateOrderModel.findByIdAndUpdate(orderId, {
            status: 'CANCELLED',
          });
        }
      }

      if (
        metadata.purpose === 'GIFT_VOUCHER' &&
        metadata.giftVoucherId
      ) {
        await this.giftVoucherService.markFailed(metadata.giftVoucherId);
      }
      
    }

    /* -------------------------------------------
       REFUND
    -------------------------------------------- */
    if (event.type === 'charge.refunded') {
      const charge = event.data.object as Stripe.Charge;

      const payment = await this.paymentModel.findOne({
        stripeChargeId: charge.id,
      });
      if (!payment) return { received: true };

      const order = await this.orderModel.findById(payment.orderId);
      if (!order) return { received: true };

      const card = charge.payment_method_details?.card;

      const cardMeta: StripeCardMeta = {
        brand: card?.brand ?? undefined,
        last4: card?.last4 ?? undefined,
        expMonth: card?.exp_month ?? undefined,
        expYear: card?.exp_year ?? undefined,
        paymentIntentId: payment.stripePaymentIntentId!,
        chargeId: charge.id,
      };

      await this.walletService.creditWallet(
        order.learnerId,
        charge.amount_refunded / 100,
        WalletTxnSource.STRIPE_REFUND,
        order._id,
        `refund-${charge.id}`,
        cardMeta,
      );

      await this.orderModel.findByIdAndUpdate(order._id, {
        status: 'REFUNDED',
      });

      await this.unlockSlots(order._id);
    }


    return { received: true };
  }



  private async handlePublicOrderSuccess(
    intent: Stripe.PaymentIntent,
    metadata: StripeIntentMetadata,
    cardMeta: StripeCardMeta,
  ) {
    const orderId = new Types.ObjectId(metadata.orderId);

    const order = await this.orderModel.findByIdAndUpdate(
      orderId,
      {
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
      },
      { new: true },
    );

    if (!order) return;

    // ✅ Referral (UNCHANGED)
    const confirmedCount = await this.orderModel.countDocuments({
      learnerId: order.learnerId,
      status: 'CONFIRMED',
    });

    if (confirmedCount === 1) {
      await this.referralService.rewardReferral(order.learnerId, order._id);
    }

    // ✅ Wallet remaining credit (UNCHANGED)
    if (order.walletCreditAfterBooking > 0) {
      await this.walletService.creditWallet(
        order.learnerId,
        order.walletCreditAfterBooking,
        WalletTxnSource.ORDER_REMAINING,
        order._id,
        intent.id,
        cardMeta,
      );
    }
  }

  private async handlePrivateOrderSuccess(
    intent: Stripe.PaymentIntent,
    metadata: StripeIntentMetadata,
  ) {
    const orderId = new Types.ObjectId(metadata.orderId);

    await this.privateOrderModel.findByIdAndUpdate(orderId, {
      status: 'CONFIRMED',
      paymentStatus: 'PAID',
      stripePaymentIntentId: intent.id,
    });
  }

}
