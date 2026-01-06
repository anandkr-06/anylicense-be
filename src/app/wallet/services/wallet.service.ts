import { Injectable,  NotFoundException } from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Learner, LearnerDocument } from '@common/db/schemas/learner.schema';

import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { Logger } from 'nestjs-pino';
import { Order, OrderDocument } from '@common/db/schemas/order.schema';
import { NotificationService } from 'modules/notifications/notification.service';
import { WalletTxnStatus, WalletTxnType } from '@common/db/schemas/wallet-transaction.schema';
import { WalletTransaction, WalletTxnSource } from '@common/db/schemas/wallet-transaction.schema';

@Injectable()
export class WalletService {
  constructor(
    @InjectModel(WalletTransaction.name)
    private readonly walletTxnModel: Model<WalletTransaction>,

    @InjectModel(Learner.name)
    private readonly learnerModel: Model<LearnerDocument>,
  ) {}

  async isTxnExists(idempotencyKey: string): Promise<boolean> {
    return !!(await this.walletTxnModel.exists({ idempotencyKey }));
  }

  async creditWallet(
    learnerId: Types.ObjectId | string,
    amount: number,
    source: WalletTxnSource,
    orderId: Types.ObjectId,
    idempotencyKey: string,
  ) {
    if (amount <= 0) return;

    // 🔒 Idempotency
    if (await this.isTxnExists(idempotencyKey)) return;

    const learner = await this.learnerModel.findById(learnerId);
    if (!learner) throw new NotFoundException('Learner not found');

    const newBalance = learner.walletBalance + amount;
    
    
    // ✅ Create ledger FIRST (authoritative record)
   
    await this.walletTxnModel.create({
      learnerId: learner._id,
      type: WalletTxnType.CREDIT,
      amount,
      balanceAfter: newBalance,
      source: WalletTxnSource.STRIPE, // ✅ NOW VALID
      referenceEntityId: orderId,
      idempotencyKey,
      status: WalletTxnStatus.COMPLETED, // ✅ CORRECT
    });

    // ✅ Update wallet balance
    await this.learnerModel.updateOne(
      { _id: learner._id },
      { $inc: { walletBalance: amount } },
    );
  }

  async debitWallet(
    learnerId: Types.ObjectId | string,
    amount: number,
    source: WalletTxnSource,
    orderId: Types.ObjectId,
    idempotencyKey: string,
  ) {
    if (amount <= 0) return;

    if (await this.isTxnExists(idempotencyKey)) return;

    const learner = await this.learnerModel.findById(learnerId);
    if (!learner || learner.walletBalance < amount) {
      throw new Error('Insufficient wallet balance');
    }

    const newBalance = learner.walletBalance - amount;

    await this.walletTxnModel.create({
      learnerId: learner._id,
      type: WalletTxnType.DEBIT,
      amount,
      balanceAfter: newBalance,
      source,
      referenceEntityId: orderId,
      idempotencyKey,
      status: WalletTxnStatus.COMPLETED, // 🔥 REQUIRED
    });

    await this.learnerModel.updateOne(
      { _id: learner._id },
      { $inc: { walletBalance: -amount } },
    );
  }
}