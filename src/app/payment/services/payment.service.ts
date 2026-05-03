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
import { WalletTransaction, WalletTransactionDocument, WalletTxnSource, WalletTxnStatus } from '@common/db/schemas/wallet-transaction.schema';
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


  // async withdrawToCard(learnerId: string, amount: number,
  //   stripePaymentIntentId: string,
  //   source: string) {
  //   if (amount <= 0) {
  //     throw new BadRequestException('Invalid withdrawal amount');
  //   }

  //   if (!stripePaymentIntentId) {
  //     throw new BadRequestException('No refundable payment found!');
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

  //   // 4️⃣ Create Stripe refund
  //   const refund = await this.stripe.refunds.create({
  //     payment_intent: stripePaymentIntentId,
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
  //     description: "Withdrawal from wallet",
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


  // async requestWithdrawToCard(
  //   learnerId: string,
  //   amount: number,
  //   stripePaymentIntentId: string,
  //   source: string,
  // ) {
  //   if (amount <= 0) {
  //     throw new BadRequestException('Invalid withdrawal amount');
  //   }

  //   const learnerObjectId = new Types.ObjectId(learnerId);

  //   // ✅ Get latest wallet balance
  //   const lastTxn = await this.walletModel
  //     .findOne({ learnerId: learnerObjectId })
  //     .sort({ createdAt: -1 });

  //   const currentBalance = lastTxn?.balanceAfter || 0;

  //   if (currentBalance < amount) {
  //     throw new BadRequestException('Insufficient wallet balance');
  //   }

  //   // ✅ Get original transaction
  //   const originalTxn = await this.walletModel.findOne({
  //     learnerId: learnerObjectId,
  //     stripePaymentIntentId,
  //     type: 'CREDIT',
  //     isRefund: false,
  //   });

  //   if (!originalTxn) {
  //     throw new BadRequestException('No valid refundable transaction found');
  //   }

  //   if (amount > originalTxn.amount) {
  //     throw new BadRequestException('Refund exceeds original amount');
  //   }

  //   // ✅ Prevent duplicate requests
  //   const existingRequest = await this.walletModel.findOne({
  //     learnerId: learnerObjectId,
  //     stripePaymentIntentId,
  //     source: 'STRIPE_REFUND',
  //     status: 'PENDING',
  //   });

  //   if (existingRequest) {
  //     throw new BadRequestException('Refund already requested');
  //   }

  //   // ✅ Deduct (hold)
  //   const newBalance = currentBalance - amount;

  //   const withdrawalTxn = await this.walletModel.create({
  //     learnerId: learnerObjectId,
  //     userId: learnerObjectId,
  //     role: 'learner',
  //     type: 'DEBIT',
  //     amount:amount,
  //     balanceAfter: newBalance,
  //     description: 'Refund Requested (Pending Approval)',
  //     source: 'STRIPE_REFUND',
  //     stripePaymentIntentId,
  //     status: 'PENDING',
  //   });

  //   // ✅ Update wallet
  //   await this.learnerModel.updateOne(
  //     { _id: learnerObjectId },
  //     { $inc: { walletBalance: -amount } },
  //   );

  //   // ✅ Mark original txn
  //   await this.walletModel.updateOne(
  //     { _id: originalTxn._id },
  //     { $set: { isRefund: true } },
  //   );

  //   return {
  //     message: 'Refund request submitted for admin approval',
  //     requestId: withdrawalTxn._id,
  //     balanceAfter: newBalance,
  //   };
  // }

  // async requestWithdrawToCard(
  //   learnerId: string,
  //   amount: number,
  //   stripePaymentIntentId: string,
  //   source: string,
  // ) {
  //   if (amount <= 0) {
  //     throw new BadRequestException('Invalid withdrawal amount');
  //   }

  //   if (source !== 'STRIPE') {
  //     throw new BadRequestException('Invalid refund source');
  //   }

  //   const learnerObjectId = new Types.ObjectId(learnerId);

  //   // ✅ Get original CREDIT txn
  //   const originalTxn = await this.walletModel.findOne({
  //     learnerId: learnerObjectId,
  //     stripePaymentIntentId,
  //     type: 'CREDIT',
  //   });

  //   if (!originalTxn) {
  //     throw new BadRequestException('No valid refundable transaction found');
  //   }

  //   const refundedAmount = originalTxn.refundedAmount || 0;
  //   const remainingAmount = originalTxn.amount - refundedAmount;

  //   if (amount > remainingAmount) {
  //     throw new BadRequestException(
  //       `Refund exceeds remaining amount (${remainingAmount})`,
  //     );
  //   }

  //   // ✅ Prevent duplicate PENDING requests for same intent
  //   const existingPending = await this.walletModel.findOne({
  //     learnerId: learnerObjectId,
  //     stripePaymentIntentId,
  //     source: 'STRIPE_REFUND',
  //     status: 'PENDING',
  //   });

  //   if (existingPending) {
  //     throw new BadRequestException('Refund already pending for this payment');
  //   }

  //   // ✅ Atomic wallet deduction (prevents race conditions)
  //   const learner = await this.learnerModel.findOneAndUpdate(
  //     {
  //       _id: learnerObjectId,
  //       walletBalance: { $gte: amount },
  //     },
  //     {
  //       $inc: { walletBalance: -amount },
  //     },
  //     { new: true },
  //   );

  //   if (!learner) {
  //     throw new BadRequestException('Insufficient wallet balance');
  //   }

  //   // ✅ Get latest txn for balanceAfter
  //   const lastTxn = await this.walletModel
  //     .findOne({ learnerId: learnerObjectId })
  //     .sort({ createdAt: -1 });

  //   const newBalance = (lastTxn?.balanceAfter || 0) - amount;

  //   // ✅ Create HOLD txn
  //   const withdrawalTxn = await this.walletModel.create({
  //     learnerId: learnerObjectId,
  //     userId: learnerObjectId,
  //     role: 'learner',
  //     type: 'DEBIT',
  //     amount,
  //     balanceAfter: newBalance,
  //     description: 'Refund Requested (Pending Approval)',
  //     source: 'STRIPE_REFUND',
  //     stripePaymentIntentId,
  //     status: 'PENDING',
  //   });

  //   // ✅ Mark request (NOT final refund)
  //   await this.walletModel.updateOne(
  //     { _id: originalTxn._id },
  //     { $set: { isRefundRequested: true } },
  //   );

  //   return {
  //     message: 'Refund request submitted for admin approval',
  //     requestId: withdrawalTxn._id,
  //     balanceAfter: newBalance,
  //     remainingRefundable: remainingAmount - amount,
  //   };
  // }
  async requestWithdrawToCard(
    learnerId: string,
    amount: number,
    stripePaymentIntentId: string,
    source: string,
  ) {
    if (amount <= 0) {
      throw new BadRequestException('Invalid withdrawal amount');
    }

    const ALLOWED_SOURCES = ['ORDER', 'GIFT_VOUCHER', 'STRIPE'];

    if (!ALLOWED_SOURCES.includes(source)) {
      throw new BadRequestException(
        'Refund allowed only for ORDER, GIFT_VOUCHER, STRIPE',
      );
    }

    const learnerObjectId = new Types.ObjectId(learnerId);

    // ✅ Get original txn
    let originalTxn;

    if (source === 'STRIPE') {
      if (!stripePaymentIntentId) {
        throw new BadRequestException('Missing stripePaymentIntentId');
      }

      originalTxn = await this.walletModel.findOne({
        learnerId: learnerObjectId,
        stripePaymentIntentId,
        type: 'CREDIT',
        source: 'STRIPE',
      });
    } else {
      originalTxn = await this.walletModel.findOne({
        learnerId: learnerObjectId,
        stripePaymentIntentId,
        type: 'CREDIT',
        source,
      });
    }

    if (!originalTxn) {
      throw new BadRequestException('No valid refundable transaction found');
    }

    // ✅ Refund validation
    const refundedAmount = originalTxn.refundedAmount || 0;
    const remainingAmount = originalTxn.amount - refundedAmount;

    // if (amount > remainingAmount) {
    //   throw new BadRequestException(
    //     `Refund exceeds remaining amount (${remainingAmount})`,
    //   );
    // }

    // ✅ Prevent duplicate pending
    const existingPending = await this.walletModel.findOne({
      learnerId: learnerObjectId,
      referenceEntityId: originalTxn._id, // 🔥 KEY FIX
      source: 'STRIPE_REFUND',
      status: 'PENDING',
    });

    if (existingPending) {
      throw new BadRequestException('Refund already pending for this transaction');
    }

    // ✅ Deduct wallet (atomic)
    const learner = await this.learnerModel.findOneAndUpdate(
      {
        _id: learnerObjectId,
        walletBalance: { $gte: amount },
      },
      {
        $inc: { walletBalance: -amount },
      },
      { new: true },
    );

    if (!learner) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    const newBalance = learner.walletBalance;

    // ✅ Create refund request txn
    const withdrawalTxn = await this.walletModel.create({
      learnerId: learnerObjectId,
      userId: learnerObjectId,
      role: 'learner',
      type: 'DEBIT',
      amount,
      balanceAfter: newBalance,
      description: `Refund requested for ${source} (Pending Approval)`,
      source: 'STRIPE_REFUND',
      referenceEntityId: originalTxn._id, // 🔥 CRITICAL FIX
      stripePaymentIntentId:
        source ? originalTxn.stripePaymentIntentId : null,
      status: 'PENDING',
    });

    // ✅ Mark request (NOT final refund)
    await this.walletModel.updateOne(
      { _id: originalTxn._id },
      { $set: { isRefundRequested: true } }, // 🔥 FIXED
    );

    return {
      message: 'Refund request submitted for admin approval',
      requestId: withdrawalTxn._id,
      balanceAfter: newBalance,
      remainingRefundable: remainingAmount - amount,
    };
  }

  // async creditedAccounts(learnerId: string) {
  //   if (!learnerId) {
  //     throw new BadRequestException('Invalid learnerId !');
  //   }

  //   const learnerObjectId = new Types.ObjectId(learnerId);

  //   const transactions = await this.walletModel.aggregate([
  //     {
  //       $match: {
  //         learnerId: learnerObjectId,
  //         type: 'CREDIT',
  //         status: 'COMPLETED',
  //         isRefund: false,
  //         isRefundRequested:false,
  //         source: { $in: ['GIFT_VOUCHER', 'ORDER', 'STRIPE'] },
  //       },
  //     },

  //     // ✅ Join with orders collection
  //     {
  //       $lookup: {
  //         from: 'orders', // ⚠️ make sure collection name is correct
  //         localField: 'referenceEntityId',
  //         foreignField: '_id',
  //         as: 'orderDetails',
  //       },
  //     },

  //     // ✅ Convert array → object (optional)
  //     {
  //       $unwind: {
  //         path: '$orderDetails',
  //         preserveNullAndEmptyArrays: true, // important for non-order sources
  //       },
  //     },

  //     {
  //       $sort: { createdAt: -1 },
  //     },

  //     {
  //       $project: {
  //         _id: 0,
  //         source: 1,
  //         amount: 1,
  //         balanceAfter: 1,
  //         status: 1,
  //         stripePaymentIntentId: 1,
  //         createdAt: 1,
  //         isRefund:1,

  //         // ✅ Order Data
  //         order: {
  //           _id: '$orderDetails._id',
  //           orderId: '$orderDetails.orderId',
  //           totalAmount: '$orderDetails.totalAmount',
  //           pricePerHour: '$orderDetails.pricePerHour',
  //           status: '$orderDetails.status',
  //           purchaseAmount: '$orderDetails.purchaseAmount',
  //           discount: '$orderDetails.discount',
  //           platformCharge: '$orderDetails.platformCharge',
  //         },
  //       },
  //     },
  //   ]);

  //   return {
  //     count: transactions.length,
  //     data: transactions,
  //   };
  // }

 async creditedAccounts(learnerId: string) {
  
  if (!learnerId) {
    throw new BadRequestException('Invalid learnerId !');
  }

  const learnerObjectId = new Types.ObjectId(learnerId);

  const debug = await this.walletModel.find({ learnerId: learnerObjectId });
console.log(debug.map(d => ({ source: d.source, status: d.status, isRefund: d.isRefund })));

  const transactions = await this.walletModel.aggregate([
    {
      $match: {
        learnerId: learnerObjectId,   // ✅ use learnerId
        type: 'CREDIT',
        status: 'COMPLETED',
        isRefund: false,
        isRefundRequested: false,
        source: { $in: ['GIFT_VOUCHER', 'ORDER', 'STRIPE'] },
      },
    },
    {
      $lookup: {
        from: 'orders',
        localField: 'referenceEntityId',
        foreignField: '_id',
        as: 'orderDetails',
      },
    },
    { $unwind: { path: '$orderDetails', preserveNullAndEmptyArrays: true } },
    { $sort: { createdAt: 1 } }, // FIFO oldest first
    {
      $project: {
        source: 1,
        amount: 1,
        balanceAfter: 1,
        status: 1,
        stripePaymentIntentId: 1,
        createdAt: 1,
        isRefund: 1,

        totalHours: 1,
        remainingHours: 1,
        consumedHours: 1,
        discountRate: 1,

        remainingValue: {
          $cond: [
            { $gt: ['$remainingHours', 0] },
            {
              $multiply: [
                '$remainingHours',
                { $ifNull: ['$orderDetails.pricePerHour', 0] },
                { $subtract: [1, { $ifNull: ['$discountRate', 0] }] },
              ],
            },
            0,
          ],
        },

        order: {
          _id: '$orderDetails._id',
          orderId: '$orderDetails.orderId',
          totalAmount: '$orderDetails.totalAmount',
          pricePerHour: '$orderDetails.pricePerHour',
          status: '$orderDetails.status',
          purchaseAmount: '$orderDetails.purchaseAmount',
          discount: '$orderDetails.discount',
          platformCharge: '$orderDetails.platformCharge',
        },
      },
    },
  ]);

  return { count: transactions.length, data: transactions };
}





}
