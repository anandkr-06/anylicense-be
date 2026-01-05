import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { WalletTransaction } from '@common/db/schemas/wallet-transaction.schema';
import { Learner, LearnerDocument } from '@common/db/schemas/learner.schema';
import { JwtPayload } from '@interfaces/user.interface';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(
    @InjectModel(WalletTransaction.name)
    private readonly walletTxnModel: Model<WalletTransaction>,

    @InjectModel(Learner.name)
    private readonly learnerModel: Model<LearnerDocument>,
  ) {}

  
  // =====================================================
  // GET WALLET BALANCE
  // =====================================================
  @Get('balance')
  async getBalance(
    @Req() @CurrentUser() currentUser: JwtPayload,
  ) {
    const learner = await this.learnerModel.findById(currentUser.sub);
    if (!learner) throw new NotFoundException('Learner not found');

    return {
      balance: learner.walletBalance,
    };
  }

  // =====================================================
  // WALLET TRANSACTION HISTORY
  // =====================================================
  @Get('transactions')
  async getTransactions(
    @Req() @CurrentUser() currentUser: JwtPayload,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const learnerId = new Types.ObjectId(currentUser.sub);

    const skip = (Number(page) - 1) * Number(limit);

    const [transactions, total] = await Promise.all([
      this.walletTxnModel
        .find({ learnerId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),

      this.walletTxnModel.countDocuments({ learnerId }),
    ]);

    return {
      data: transactions,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
      },
    };
  }

  // =====================================================
  // SINGLE TRANSACTION DETAILS
  // =====================================================
  @Get('transactions/:id')
  async getTransaction(
    @Req() @CurrentUser() currentUser: JwtPayload,
    @Param('id') txnId: string,
  ) {
    if (!Types.ObjectId.isValid(txnId)) {
      throw new BadRequestException('Invalid transaction id');
    }
  
    const txn = await this.walletTxnModel.findOne({
      _id: new Types.ObjectId(txnId),
      learnerId: new Types.ObjectId(currentUser.sub),
    });
  
    if (!txn) {
      throw new NotFoundException('Transaction not found');
    }
  
    return txn;
  }

  
}
