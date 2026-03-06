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

  async instructorFastCash(instructorId: string, amount: number) {

    const instructor = await this.userModel
      .findById(instructorId)
      .lean();
  
    if (!instructor) {
      throw new BadRequestException('Instructor not found');
    }
  
    let stripeAccountId = instructor.stripeAccountId;
  
    // Create Stripe account if missing
    if (!stripeAccountId) {
  
      const account = await this.stripeService.createExpressAccount(
        instructor.email
      );
  
      stripeAccountId = account.id;
  
      await this.userModel.findByIdAndUpdate(instructorId, {
        stripeAccountId,
      });
  
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
  
    // ❗ Validate requested amount
    if (!amount || amount <= 0) {
      throw new BadRequestException('Invalid payout amount');
    }
  
    if (amount > walletBalance) {
      throw new BadRequestException('Requested amount exceeds wallet balance');
    }
  
    const payoutAmount = Math.round(amount * 100); // Stripe needs cents
  
    const payout = await this.stripeService.instantPayout(
      stripeAccountId,
      payoutAmount,
    );
  
    // ✅ Deduct from wallet
    await this.userModel.findByIdAndUpdate(instructorId, {
      $inc: { walletBalance: -amount },
    });
  
    return payout;
  }

}