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
      ) {}


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

//   async instructorFastCash(instructorId: string, amount: number) {

//   const instructor = await this.userModel
//     .findById(instructorId)
//     .lean();

//   if (!instructor) {
//     throw new BadRequestException('Instructor not found');
//   }

//   let stripeAccountId = instructor.stripeAccountId;

  
//   // Create Stripe account if missing
//   if (!stripeAccountId) {
//     console.log("Instructor",instructor);
//     const account = await this.stripeService.createExpressAccount(
//       instructor.email
//     );

//     stripeAccountId = account.id;

//     await this.userModel.findByIdAndUpdate(instructorId, {
//       stripeAccountId,
//     });

//     const onboardingLink =
//       await this.stripeService.createAccountOnboardingLink(stripeAccountId);

//     return {
//       message: 'Stripe onboarding required',
//       onboardingUrl: onboardingLink.url,
//     };
//   }

//   const walletBalance = Number((instructor as any).walletBalance ?? 0);

//   if (walletBalance <= 0) {
//     throw new BadRequestException('No balance available');
//   }

//   // ❗ Validate requested amount
//   if (!amount || amount <= 0) {
//     throw new BadRequestException('Invalid payout amount');
//   }

//   if (amount > walletBalance) {
//     throw new BadRequestException('Requested amount exceeds wallet balance');
//   }

//   const payoutAmount = Math.round(amount * 100); // Stripe needs cents

//   const payout = await this.stripeService.instantPayout(
//     stripeAccountId,
//     payoutAmount,
//   );

//   // ✅ Deduct from wallet
//   await this.userModel.findByIdAndUpdate(instructorId, {
//     $inc: { walletBalance: -amount },
//   });

//   return payout;
// }
async instructorFastCash(instructorId: string, amount: number) {

  const instructor = await this.userModel.findById(instructorId).lean();

  if (!instructor) {
    throw new BadRequestException('Instructor not found');
  }

  const stripeAccountId = instructor.stripeAccountId;

  if (!stripeAccountId) {
    throw new BadRequestException('Stripe account not connected');
  }

  const account = await this.stripeService.getAccount(stripeAccountId);

  if (
    !account.payouts_enabled ||
    account.capabilities?.transfers !== 'active'
  ) {
    const onboardingLink =
      await this.stripeService.createAccountOnboardingLink(stripeAccountId);

    return {
      message: 'Stripe onboarding required',
      onboardingUrl: onboardingLink.url,
    };
  }

  const walletBalance = Number((instructor as any).walletBalance ?? 0);

  if (walletBalance <= 0) {
    throw new BadRequestException('No balance available');
  }

  if (!amount || amount <= 0) {
    throw new BadRequestException('Invalid payout amount');
  }

  if (amount > walletBalance) {
    throw new BadRequestException('Requested amount exceeds wallet balance');
  }

  const payoutAmount = Math.round(amount * 100);

  // Check Stripe platform balance
  const balance = await this.stripeService.getPlatformBalance();
  const available = balance.available[0]?.amount || 0;

  if (available < payoutAmount) {
    throw new BadRequestException(
      'Stripe platform balance insufficient',
    );
  }

  const transfer = await this.stripeService.createTransfer(
    stripeAccountId,
    payoutAmount,
    instructorId,
  );

  const payout = await this.stripeService.instantPayout(
    stripeAccountId,
    payoutAmount,
  );

  await this.userModel.findByIdAndUpdate(instructorId, {
    $inc: { walletBalance: -amount },
  });

  await this.walletTransactionModel.create({
    userId: instructorId,
    role: 'instructor',
    type: 'DEBIT',
    amount: amount,
    balanceAfter: walletBalance - amount,
    source: 'FAST_CASH',
  });

  return {
    message: 'Fast cash successful',
    amount,
    transferId: transfer.id,
    payoutId: payout.id,
  };
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
async creditInstructorWallet(transactionId: Types.ObjectId) {

  const txn = await this.transactionModel.findById(transactionId);

  if (!txn) {
    throw new BadRequestException('Transaction not found');
  }

  if (txn.payoutStatus === 'PAID') {
    throw new BadRequestException('Wallet already credited');
  }

  const instructorEarning = txn.instructorEarning;

  // 1️⃣ Update wallet balance
  const instructor = await this.userModel.findByIdAndUpdate(
    txn.instructorId,
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
    userId: txn.instructorId,
    type: 'CREDIT',
    role: 'instructor',
    amount: instructorEarning,
    balanceAfter: instructor.walletBalance,
    source: 'LESSON_COMPLETED',
    referenceId: txn.orderId
  });

  return {
    message: 'Instructor wallet credited',
    balance: instructor.walletBalance
  };
}

//Instructor Wallet History API

async getInstructorWallet(instructorId: string) {

  return this.walletTransactionModel.find({
    userId: instructorId,
    role: "instructor"
  }).sort({ createdAt: -1 });
}


}