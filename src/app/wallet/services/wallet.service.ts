import { Injectable,  NotFoundException } from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Learner, LearnerDocument } from '@common/db/schemas/learner.schema';

import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { Logger } from 'nestjs-pino';
import { Order, OrderDocument } from '@common/db/schemas/order.schema';
import { NotificationService } from 'modules/notifications/notification.service';
import { WalletTransaction, WalletTransactionDocument } from '@common/db/schemas/wallet-transaction.schema';

@Injectable()
export class WalletService {
  constructor(
    @InjectModel(WalletTransaction.name)
    private readonly walletTxnModel: Model<WalletTransactionDocument>,
    @InjectModel(Learner.name)
    private readonly learnerModel: Model<LearnerDocument>,
  ) {}

  
  async creditWallet(
    learnerId: Types.ObjectId,
    amount: number,
    source: WalletTxnSource,
    referenceId?: Types.ObjectId,
    idempotencyKey?: string,
  ) {
    if (idempotencyKey) {
      const exists = await this.walletTxnModel.findOne({ idempotencyKey });
      if (exists) return exists;
    }
  
    const learner = await this.learnerModel.findById(learnerId);
    if (!learner) throw new NotFoundException('Learner not found');
  
    learner.walletBalance += amount;
    await learner.save();
  
    return this.walletTxnModel.create({
      learnerId,
      amount,
      source,
      referenceId,
      idempotencyKey,
      balanceAfter: learner.walletBalance,
    });
  }
  
  async reverseTransaction(txnId: Types.ObjectId) {
    const txn = await this.walletTxnModel.findById(txnId);
    if (!txn || txn.status === WalletTxnStatus.REVERSED) return;
  
    const learner = await this.learnerModel.findById(txn.learnerId);
    if (!learner) return;
  
    if (txn.type === WalletTxnType.DEBIT) {
      learner.walletBalance += txn.amount;
    } else {
      learner.walletBalance -= txn.amount;
    }
  
    await learner.save();
  
    txn.status = WalletTxnStatus.REVERSED;
    await txn.save();
  }

  

}

