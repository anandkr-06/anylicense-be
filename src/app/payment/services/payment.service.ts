import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import Stripe from 'stripe';

import { Order, OrderDocument } from '@common/db/schemas/order.schema';
import { Payment, PaymentDocument, PaymentPurpose } from '@common/db/schemas/payment.schema';
import { GiftVoucherDocument } from '@app/gift-vouchers/schema/gift-voucher-schema';
import { WalletTransaction, WalletTransactionDocument } from '@common/db/schemas/wallet-transaction.schema';
import { LearnerDocument } from '@common/db/schemas/learner.schema';

export type StripeIntentMetadata = {
  purpose: 'ORDER_PAYMENT' | 'WALLET_TOPUP';

  orderId?: string;

  // ONLY for PUBLIC orders
  learnerId?: string;

  instructorId?: string;

  // Used to branch in webhook
  orderType?: 'PUBLIC' | 'PRIVATE';

  /* ✅ ADD THESE (OPTIONAL → NO BREAKING CHANGE) */
  originalAmount?: string;
  platformFee?: string;
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

    @InjectModel('GiftVoucher')
    private readonly giftVoucherModel: Model<GiftVoucherDocument>,

    // @InjectModel('Wallet')
    // private readonly walletModel: Model<WalletTransactionDocument>,

    @InjectModel(WalletTransaction.name) private walletModel: Model<WalletTransaction>,

    @InjectModel('Learner')
    private readonly learnerModel: Model<LearnerDocument>,

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

    console.log('Stripe metadata:', metadata);

    // 4️⃣ Save payment record
    await this.paymentModel.create({
      orderId: order._id,
      orderType, // 🔥 useful for webhook/debug
      amount: Math.round(order.totalAmount * 100),
      stripePaymentIntentId: paymentIntent.id,
      status: 'INITIATED',
      purpose: PaymentPurpose.ORDER,
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
  // async createWalletTopupIntent(learnerId: string, amount: number) {
  //   if (amount <= 0) {
  //     throw new BadRequestException('Invalid amount');
  //   }

  //   const metadata: StripeIntentMetadata = {
  //     purpose: 'WALLET_TOPUP',
  //     learnerId,
  //   };

  //   const paymentIntent = await this.stripe.paymentIntents.create({
  //     amount: Math.round(amount * 100),
  //     currency: 'AUD',
  //     automatic_payment_methods: { enabled: true },
  //     metadata,
  //   });

  //   return {
  //     clientSecret: paymentIntent.client_secret,
  //     amount,
  //     currency: 'AUD',
  //     metadata,
  //   };
  // }

  async createWalletTopupIntent(learnerId: string, amount: number) {
    if (amount <= 0) {
      throw new BadRequestException('Invalid amount');
    }
  
    /* ✅ Calculate 2% platform fee */
    const platformFee = Number((amount * 0.02).toFixed(2));
  
    /* ✅ Total payable */
    const totalAmount = amount + platformFee;
  
    const metadata: StripeIntentMetadata = {
      purpose: 'WALLET_TOPUP',
      learnerId,
      originalAmount: amount.toString(),
      platformFee: platformFee.toString(),
    };
  
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // ✅ charge total
      currency: 'AUD',
      automatic_payment_methods: { enabled: true },
      metadata,
    });
  
    return {
      clientSecret: paymentIntent.client_secret,
      amount, // original amount (wallet credit)
      platformFee,
      totalAmount,
      currency: 'AUD',
      metadata,
    };
  }

  async createGiftVoucherPaymentIntent(giftVoucherId: string) {
    const voucher = await this.giftVoucherModel.findOne({
      _id: giftVoucherId,
      status: 'PENDING', // or CREATED or DRAFT
    });

    if (!voucher) {
      throw new BadRequestException('Invalid or already paid voucher');
    }

    // 🔒 lock voucher
    await this.giftVoucherModel.updateOne(
      { _id: giftVoucherId },
      {
        status: 'PAYMENT_PENDING',
        paymentStartedAt: new Date(),
      },
    );

    const intent = await this.stripe.paymentIntents.create({
      amount: Math.round(voucher.amount * 100),
      currency: 'aud',
      automatic_payment_methods: { enabled: true },
      metadata: {
        purpose: 'GIFT_VOUCHER',
        giftVoucherId: voucher._id.toString(),
      },
    });


    // await this.paymentModel.create({
    //   amount: voucher.amount,
    //   currency: 'AUD',
    //   status: 'PENDING',
    //   stripePaymentIntentId: intent.id,
    //   purpose: 'GIFT_VOUCHER',
    //   giftVoucherId: voucher._id,
    // });
    await this.paymentModel.create({
      purpose: PaymentPurpose.GIFT_VOUCHER,
      giftVoucherId: voucher._id,
      amount: voucher.amount,
      stripePaymentIntentId: intent.id,
      status: 'INITIATED',
    });


    return {
      clientSecret: intent.client_secret,
    };
  }


  /* -----------------------------
   WITHDRAW WALLET BALANCE
-------------------------------- */

 
  // async withdrawToCard(learnerId: string, amount: number,
  //   stripePaymentIntentId: string,
  //   source: string) {
  //   if (amount <= 0) {
  //     throw new BadRequestException('Invalid withdrawal amount');
  //   }

  //   if (!stripePaymentIntentId) {
  //     throw new BadRequestException('Invalid stripePaymentIntentId !');
  //   }

  //   if (!source) {
  //     throw new BadRequestException('Invalid source !');
  //   }

  //   const learnerObjectId = new Types.ObjectId(learnerId);

  //   // 1️⃣ Check wallet balance
  //   const lastTxn = await this.walletModel
  //     .findOne({ learnerId: learnerObjectId })
  //     .sort({ createdAt: -1 });

  //   const currentBalance = lastTxn?.balanceAfter || 0;

  //   if (currentBalance < amount) {
  //     throw new BadRequestException('Insufficient wallet balance');
  //   }

  //   // 2️⃣ Find learner order
  //   const order = await this.orderModel
  //     .findOne({
  //       learnerId: learnerObjectId, status: 'CONFIRMED',
  //       paymentStatus: 'PAID', stripeAmount: { $gt: 0 }
  //     })
  //     .sort({ createdAt: -1 });

  //   if (!order) {
  //     throw new BadRequestException('No order found for learner');
  //   }

  //   // 3️⃣ Find payment using orderId
  //   const payment = await this.paymentModel.findOne({
  //     orderId: order._id,
  //     status: 'SUCCESS',
  //   });

  //   if (!payment?.stripePaymentIntentId) {
  //     throw new BadRequestException('No refundable payment found');
  //   }

  //   // 4️⃣ Create Stripe refund
  //   const refund = await this.stripe.refunds.create({
  //     payment_intent: payment.stripePaymentIntentId,
  //     amount: Math.round(amount * 100),
  //   });

  //   // 5️⃣ Update wallet balance
  //   const newBalance = currentBalance - amount;

  //   const withdrawalTxn = await this.walletModel.create({
  //     learnerId: learnerObjectId,
  //     userId: learnerObjectId,
  //     role: 'learner',
  //     type: 'DEBIT',
  //     amount,
  //     balanceAfter: newBalance,
  //     source: 'STRIPE_REFUND',
  //     referenceEntityId: refund.id,
  //     status: 'COMPLETED',
  //   });

  //   await this.learnerModel.updateOne(
  //     { _id: learnerObjectId },
  //     { $inc: { walletBalance: -amount } },
  //   );

  //   return {
  //     message: 'Withdrawal refunded to card',
  //     refundId: refund.id,
  //     balanceAfter: newBalance,
  //   };
  // }

  async withdrawToCard(learnerId: string, amount: number,
    stripePaymentIntentId: string,
    source: string) {
    if (amount <= 0) {
      throw new BadRequestException('Invalid withdrawal amount');
    }

    if (!stripePaymentIntentId) {
      throw new BadRequestException('No refundable payment found!');
    }

    if (!source) {
      throw new BadRequestException('Invalid source !');
    }

    const learnerObjectId = new Types.ObjectId(learnerId);

    // 1️⃣ Check wallet balance
    const lastTxn = await this.walletModel
      .findOne({ learnerId: learnerObjectId })
      .sort({ createdAt: -1 });

    const currentBalance = lastTxn?.balanceAfter || 0;

    if (currentBalance < amount) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    // 4️⃣ Create Stripe refund
    const refund = await this.stripe.refunds.create({
      payment_intent: stripePaymentIntentId,
      amount: Math.round(amount * 100),
    });

    // 5️⃣ Update wallet balance
    const newBalance = currentBalance - amount;

    const withdrawalTxn = await this.walletModel.create({
      learnerId: learnerObjectId,
      userId: learnerObjectId,
      role: 'learner',
      type: 'DEBIT',
      amount,
      balanceAfter: newBalance,
      description:"Withdrawal from wallet",
      source: 'STRIPE_REFUND',
      referenceEntityId: refund.id,
      status: 'COMPLETED',
    });

    await this.learnerModel.updateOne(
      { _id: learnerObjectId },
      { $inc: { walletBalance: -amount } },
    );

    return {
      message: 'Withdrawal refunded to card',
      refundId: refund.id,
      balanceAfter: newBalance,
    };
  }


  
  async creditedAccounts(learnerId: string) {
    if (!learnerId) {
      throw new BadRequestException('Invalid learnerId !');
    }
  
    const learnerObjectId = new Types.ObjectId(learnerId);
  
    const transactions = await this.walletModel.aggregate([
      {
        $match: {
          learnerId: learnerObjectId,
          type: 'CREDIT',
          status: 'COMPLETED',
          $or: [
            { source: { $in: ['GIFT_VOUCHER', 'ORDER'] } },
            {
              source: 'STRIPE',
              stripePaymentIntentId: { $exists: true, $nin: [null, ''] },
            },
          ],
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      // {
      //   $group: {
      //     _id: '$source',
      //     lastTransaction: { $first: '$$ROOT' },
      //   },
      // },
      {
        $project: {
          _id: 0,
          source: '$_id',
          data: {
            learnerId: '$lastTransaction.learnerId',
            type: '$lastTransaction.type',
            amount: '$lastTransaction.amount',
            balanceAfter: '$lastTransaction.balanceAfter',
            referenceEntityId: '$lastTransaction.referenceEntityId',
            status: '$lastTransaction.status',
            stripePaymentIntentId: '$lastTransaction.stripePaymentIntentId',
            createdAt: '$lastTransaction.createdAt',
            updatedAt: '$lastTransaction.updatedAt',
          },
        },
      },
    ]);
  
    // ❌ Remove null data (safety, though aggregation already avoids it)
    const filtered = transactions.filter((item) => item.data !== null);
  
    return {
      count: filtered.length,
      data: filtered,
    };
  }
}
