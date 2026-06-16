import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  InstructorTransaction,
  InstructorTransactionDocument,
} from '@common/db/schemas/instructor-transactions.schema';

import {
  Payout,
  PayoutDocument,
} from '@common/db/schemas/payout.schema';

import { StripeService } from './stripe.service';
import { User } from '@common/db/schemas/user.schema';
import { InstructorProfile, InstructorProfileDocument } from '@common/db/schemas/instructor-profile.schema';
import { WalletTransaction, WalletTransactionDocument } from '@common/db/schemas/wallet-transaction.schema';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class PayoutService {
  constructor(
    private stripeService: StripeService,
    @InjectModel(InstructorTransaction.name)
    private transactionModel: Model<InstructorTransactionDocument>,

    @InjectModel(Payout.name)
    private payoutModel: Model<PayoutDocument>,

    @InjectModel(User.name)
    private userModel: Model<User>,

    @InjectModel(InstructorProfile.name)
    private readonly instructorProfileModel: Model<InstructorProfileDocument>,
    @InjectModel(WalletTransaction.name)
    private readonly walletTransactionModel: Model<WalletTransactionDocument>,
    private readonly logger: PinoLogger,
  ) { }


  async generateWeeklyPayout() {

    // Step 1: Find instructors with pending payouts
    const instructorIds = await this.transactionModel.distinct(
      'instructorId',
      { payoutStatus: 'PENDING_PAYOUT' },
    );

    const payouts = [];

    for (const instructorId of instructorIds) {

      // Step 2: Get all pending transactions
      const transactions = await this.transactionModel.find({
        instructorId: new Types.ObjectId(instructorId),
        payoutStatus: 'PENDING_PAYOUT',
      });

      if (!transactions.length) continue;

      // Step 3: Calculate total payout
      const totalAmount = transactions.reduce(
        (sum, t) => sum + t.instructorEarning,
        0,
      );

      // Step 4: Create payout record
      const payout = await this.payoutModel.create({
        instructorId,
        totalAmount,
        transactionIds: transactions.map(t => t._id),
        payoutWeekStart: this.getWeekStart(),
        payoutWeekEnd: this.getWeekEnd(),
        status: 'PAID',
        paidAt: new Date(),
      });

      // Step 5: Mark transactions as PAID
      await this.transactionModel.updateMany(
        { _id: { $in: payout.transactionIds } },
        {
          $set: {
            payoutStatus: 'PAID',
            payoutDate: new Date(),
          },
        },
      );

      payouts.push(payout);
    }

    return {
      message: 'Weekly payouts generated',
      totalPayouts: payouts.length,
      payouts,
    };
  }

  // Helper functions
  getWeekStart() {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day;
    return new Date(now.setDate(diff));
  }

  getWeekEnd() {
    const start = this.getWeekStart();
    return new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  }

  async getStripeStatus(
  instructorId: string,
) {
  const instructor =
    await this.userModel.findById(
      instructorId,
    );

  return {
    stripeAccountId:
      instructor?.stripeAccountId,

    onboardingCompleted:
      instructor?.stripeOnboardingCompleted,

    requirements:
      instructor?.stripeRequirements,
  };
}

  async instructorFastCash(
    instructorId: string,
    amount: number,
  ) {

    // =========================================================
    // ✅ VALIDATE AMOUNT
    // =========================================================

    if (!amount || amount <= 0) {
      throw new BadRequestException(
        'Invalid payout amount',
      );
    }

    // =========================================================
    // ✅ GET INSTRUCTOR
    // =========================================================

    let instructor =
      await this.userModel.findById(
        instructorId,
      );

    if (!instructor) {
      throw new BadRequestException(
        'Instructor not found',
      );
    }

    let stripeAccountId =
      instructor.stripeAccountId;

    // =========================================================
    // ✅ CREATE STRIPE ACCOUNT IF MISSING
    // =========================================================

    if (!stripeAccountId) {

      const account =
        await this.stripeService
          .createExpressAccount(
            instructor.email,
            instructorId,
          );

      await this.userModel.findByIdAndUpdate(
        instructorId,
        {
          stripeAccountId: account.id,

          stripeOnboardingCompleted:
            false,

          stripePayoutsEnabled:
            false,

          stripeChargesEnabled:
            false,

          stripeRequirements: [],
        },
      );

      const onboardingLink =
        await this.stripeService
          .createAccountOnboardingLink(
            account.id,
          );

      return {
        message:
          'Stripe account created. Please complete onboarding.',

        onboardingCompleted:
          false,

        onboardingUrl:
          onboardingLink.url,
      };
    }

    // =========================================================
    // ✅ ONBOARDING CHECK
    // =========================================================

    if (!instructor.stripeOnboardingCompleted) {

      try {

        const account =
          await this.stripeService.getAccount(
            stripeAccountId,
          );

        const currentlyDue =
          account.requirements
            ?.currently_due ?? [];

        const onboardingCompleted =
          account.payouts_enabled
          && account.capabilities
            ?.transfers === 'active'
          && currentlyDue.length === 0;

        if (onboardingCompleted) {

          await this.userModel.findByIdAndUpdate(
            instructorId,
            {
              stripeOnboardingCompleted:
                true,

              stripePayoutsEnabled:
                account.payouts_enabled,

              stripeChargesEnabled:
                account.charges_enabled,

              stripeRequirements:
                currentlyDue,
            },
          );

        } else {

          const onboardingLink =
            await this.stripeService
              .createAccountOnboardingLink(
                stripeAccountId,
              );

          return {
            message:
              'Please complete your Stripe onboarding.',

            onboardingCompleted:
              false,

            onboardingUrl:
              onboardingLink.url,

            requirements:
              currentlyDue,
          };
        }

      } catch (error) {

        this.logger.warn(
          'Stripe onboarding verification failed',
          error,
        );

        const onboardingLink =
          await this.stripeService
            .createAccountOnboardingLink(
              stripeAccountId,
            );

        return {
          message:
            'Please complete your Stripe onboarding.',

          onboardingCompleted:
            false,

          onboardingUrl:
            onboardingLink.url,
        };
      }
    }

    // =========================================================
    // ✅ STRIPE ACCOUNT READY
    // =========================================================

    // =========================================================
    // ✅ CONVERT TO CENTS
    // =========================================================

    const payoutAmount =
      Math.round(amount * 100);

    // =========================================================
    // ✅ CHECK STRIPE PLATFORM BALANCE
    // =========================================================

    const balance =
      await this.stripeService
        .getPlatformBalance();

    const audBalance =
      balance.available.find(
        (b) => b.currency === 'aud',
      );

    const available =
      audBalance?.amount || 0;

    if (available < payoutAmount) {

      throw new BadRequestException(
        'Stripe platform balance insufficient',
      );
    }

    // =========================================================
    // ✅ ATOMIC WALLET DEDUCTION
    // =========================================================

    const updatedInstructor =
      await this.userModel.findOneAndUpdate(
        {
          _id: instructorId,
          walletBalance: {
            $gte: amount,
          },
        },
        {
          $inc: {
            walletBalance: -amount,
          },
        },
        {
          new: true,
        },
      );

    if (!updatedInstructor) {

      throw new BadRequestException(
        'Insufficient wallet balance',
      );
    }

    try {

      const transfer =
        await this.stripeService
          .createTransfer(
            stripeAccountId,
            payoutAmount,
            instructorId,
          );

      const payout =
        await this.stripeService
          .instantPayout(
            stripeAccountId,
            payoutAmount,
          );

      await this.walletTransactionModel.create({
        userId:
          new Types.ObjectId(
            instructorId,
          ),
        role: 'instructor',
        type: 'DEBIT',
        amount,
        balanceAfter:
          updatedInstructor.walletBalance,
        source: 'FAST_CASH',
      });

      return {
        message:
          'Fast cash successful',
        amount,
        transferId:
          transfer.id,
        payoutId:
          payout.id,
        walletBalance:
          updatedInstructor.walletBalance,
      };

    } catch (error: any) {

      await this.userModel.findByIdAndUpdate(
        instructorId,
        {
          $inc: {
            walletBalance: amount,
          },
        },
      );

      throw new BadRequestException(
        'Stripe payout failed: '
        + (
          error?.message
          || 'Unknown error'
        ),
      );
    }
  }

  async addWalletBalance(instructorId: string, amount: number) {
    return this.userModel.findByIdAndUpdate(
      instructorId,
      { $inc: { walletBalance: amount } },
      { new: true }
    );
  }


  async getTransactions(
    instructorId: string,
    page: number,
    limit: number,
    startDate?: string,
    endDate?: string,
  ) {
    const skip = (page - 1) * limit;

    const instructorData = await this.instructorProfileModel.findOne({
      userId: new Types.ObjectId(instructorId),
    });

    if (!instructorData) {
      throw new BadRequestException('Instructor not found');
    }

    const match: any = {
      instructorId: new Types.ObjectId(instructorData._id),
    };

    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = new Date(endDate);
    }

    const [transactions, totalCount, totalAmount] = await Promise.all([
      this.transactionModel.aggregate([
        { $match: match },

        {
          $lookup: {
            from: 'learners',
            localField: 'learnerId',
            foreignField: '_id',
            as: 'learner',
          },
        },

        { $unwind: { path: '$learner', preserveNullAndEmptyArrays: true } },

        {
          $project: {
            orderId: 1,
            slotId: 1,
            type: 1,
            hours: 1,
            pricePerHour: 1,
            grossAmount: 1,
            platformCommission: 1,
            discountCommission: 1,
            instructorEarning: 1,
            payoutStatus: 1,
            createdAt: 1,
            // learnerName: {
            //   $concat: ['$learner.firstName', ' ', '$learner.lastName'],
            // },
            learnerFirstName: '$learner.firstName',
            learnerLastName: '$learner.lastName',
          },
        },

        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
      ]),

      this.transactionModel.countDocuments(match),

      this.transactionModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$grossAmount' },
          },
        },
      ]),
    ]);

    return {
      page,
      limit,
      totalRecords: totalCount,
      totalAmount: totalAmount[0]?.totalAmount || 0,
      transactions,
    };
  }

  //Instructor wallet Transactions:
  /**
   * Credit Instructor Wallet (After Lesson Completed)
   * @param transactionId 
   * @returns 
   */
  async creditInstructorWallet(transactionId: Types.ObjectId, source: string) {

    const txn = await this.transactionModel.findById(transactionId);

    if (!txn) {
      throw new BadRequestException('Transaction not found');
    }

    // if (txn.payoutStatus === 'PAID') {
    //   throw new BadRequestException('Wallet already credited');
    // }

    const instructorEarning = txn.instructorEarning;

    const instructorData = await this.instructorProfileModel.findOne({
      _id: new Types.ObjectId(txn.instructorId),
    });
    if (!instructorData) {
      throw new BadRequestException('Instructor not found');
    }
    // 1️⃣ Update wallet balance
    const instructor = await this.userModel.findByIdAndUpdate(
      instructorData.userId,
      { $inc: { walletBalance: instructorEarning } },
      { new: true }
    );

    if (!instructor) {
      throw new BadRequestException('Instructor not found');
    }

    // 2️⃣ Update payout status
    await this.transactionModel.findByIdAndUpdate(transactionId, {
      payoutStatus: 'PAID',
      payoutDate: new Date()
    });

    // 3️⃣ Create wallet ledger
    await this.walletTransactionModel.create({
      userId: new Types.ObjectId(instructorData.userId),
      type: 'CREDIT',
      role: 'instructor',
      amount: instructorEarning,
      balanceAfter: instructor.walletBalance,
      source: (source) ? source : 'LESSON_COMPLETED',
      referenceId: txn.orderId
    });

    return {
      message: 'Instructor wallet credited',
      balance: instructor.walletBalance
    };
  }

  //Instructor Wallet History API

  async getInstructorWalletHistory(
    instructorId: string,
    page: number = 1,
    limit: number = 10,
    startDate?: string,
    endDate?: string,
  ) {

    const skip = (page - 1) * limit;

    const match: any = {
      userId: new Types.ObjectId(instructorId),
      role: 'instructor',
    };

    // ✅ Date filter
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = new Date(endDate);
    }

    const [walletTransactions, totalRecords, totalAmount] = await Promise.all([

      this.walletTransactionModel.find(match)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      this.walletTransactionModel.countDocuments(match),

      this.walletTransactionModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalCredits: {
              $sum: {
                $cond: [{ $eq: ['$type', 'CREDIT'] }, '$amount', 0],
              },
            },
            totalDebits: {
              $sum: {
                $cond: [{ $eq: ['$type', 'DEBIT'] }, '$amount', 0],
              },
            },
          },
        },
      ]),
    ]);

    return {
      page,
      limit,
      totalRecords,
      totalCredits: totalAmount[0]?.totalCredits || 0,
      totalDebits: totalAmount[0]?.totalDebits || 0,
      walletTransactions,
    };
  }


}