import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import dayjs from 'dayjs';

import { GiftVoucher, GiftVoucherDocument } from '../schema/gift-voucher-schema';
import { CreateGiftVoucherDto } from '../dto/create-gift-voucher.dto';

import { NotificationService } from 'modules/notifications/notification.service';
import { SmtpErrorHandlerService } from '@common/smtp/smtp-error-handler.service';

import { WalletService } from '@app/wallet/services/wallet.service';
import { WalletTxnSource } from '@common/db/schemas/wallet-transaction.schema';

import { LearnerService } from '@app/userlearners/services/leaner.service';
import { LearnerDocument } from '@common/db/schemas/learner.schema';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class GiftVoucherService {
  constructor(
    @InjectModel(GiftVoucher.name)
    private readonly voucherModel: Model<GiftVoucherDocument>,

    private readonly notificationService: NotificationService,
    private readonly smtpErrorHandler: SmtpErrorHandlerService,

    @Inject(forwardRef(() => LearnerService))
    private readonly learnerService: LearnerService,

    @Inject(forwardRef(() => WalletService))
    private readonly walletService: WalletService,
    private readonly logger: PinoLogger,
  ) { }

  /* ------------------------------------
     CREATE VOUCHER (BEFORE PAYMENT)
  ------------------------------------ */
  async createVoucher(dto: CreateGiftVoucherDto) {
    const voucher = await this.voucherModel.create({
      ...dto,
      balance: dto.amount,
      status: 'PENDING',
      expiresAt: dayjs().add(12, 'month').toDate(),
    });

    return {
      voucherId: voucher._id,
      amount: voucher.amount,
    };
  }

  /* ------------------------------------
     ACTIVATE AFTER STRIPE SUCCESS
  ------------------------------------ */
  async activateVoucher(voucherId: string, paymentId: string) {
    const code = this.generateCode();

    const voucher = await this.voucherModel.findByIdAndUpdate(
      voucherId,
      {
        code,
        paymentId,
        status: 'ACTIVE',
      },
      { new: true },
    );

    if (!voucher) {
      throw new BadRequestException('Voucher not found');
    }

    // ✅ EXISTING LEARNER → instant redeem
    await this.tryRedeemForExistingLearner(voucher);

    // Ntofication for sender (confirmation)
    try {
      await this.notificationService.sendGiftVoucherSentConfirmationEmail({
        senderEmail: voucher.sender.email,
        senderName: voucher.sender.firstName,
        recipientName: voucher.recipient.firstName,
        recipientEmail: voucher.recipient.email,
        amount: voucher.amount,
        voucherCode: voucher.code,
        sentAt: new Date(),
      });
    } catch (err) {
      this.logger.error('Voucher credited email failed', err);
    }


    // 📧 Notify recipient

    try {
      await this.notificationService.sendGiftVoucherEmail({
        recipientEmail: voucher.recipient.email,
        recipientName: voucher.recipient.firstName,
        senderName: voucher.sender.firstName,
        amount: voucher.amount,
        voucherCode: voucher.code,
        expiryDate: voucher.expiresAt,
      });
    }
    catch (err) {
      this.logger.error('Gift voucher email failed', err);
      this.smtpErrorHandler.handle(err, {
        source: 'gift-voucher-email',
        voucherId: voucher._id,
      });
    }
  }

  /* ------------------------------------
     MARK PAYMENT FAILED
  ------------------------------------ */
  async markFailed(voucherId: string) {
    await this.voucherModel.findByIdAndUpdate(voucherId, {
      status: 'FAILED',
    });
  }

  /* ------------------------------------
     CALLED AFTER LEARNER REGISTRATION
  ------------------------------------ */
  async tryRedeemForLearner(learner: LearnerDocument) {
    const voucher = await this.voucherModel.findOne({
      status: 'ACTIVE',
      $or: [
        { 'recipient.email': learner.email },
        { 'recipient.phone': learner.mobileNumber },
      ],
    });

    if (!voucher) return;

    await this.redeemVoucher(voucher, learner);

  }

  /* ------------------------------------
     EXISTING LEARNER CHECK (AFTER PAYMENT)
  ------------------------------------ */
  private async tryRedeemForExistingLearner(
    voucher: GiftVoucherDocument,
  ) {
    const learner = await this.learnerService.findByEmailOrMobile(
      voucher.recipient?.email,
      voucher.recipient?.phone,
    );

    if (!learner) return;

    await this.redeemVoucher(voucher, learner);
  }

  /* ------------------------------------
     SINGLE SOURCE OF TRUTH (ATOMIC)
  ------------------------------------ */
  private async redeemVoucher(
    voucher: GiftVoucherDocument,
    learner: LearnerDocument,
  ) {
    // 🔒 Atomic guard
    const updatedVoucher = await this.voucherModel.findOneAndUpdate(
      {
        _id: voucher._id,
        status: 'ACTIVE',
      },
      {
        status: 'REDEEMED',
        redeemedBy: learner._id,
        redeemedAt: new Date(),
      },
      { new: true },
    );

    this.logger.info(`Voucher response:  ${JSON.stringify(updatedVoucher)}`);

    if (!updatedVoucher) return;

    this.logger.info(`Voucher ${updatedVoucher.code} redeemed by learner ${learner._id}`);

    // 💰 Credit wallet (FIXED)
    await this.walletService.creditWallet(
      learner._id,
      updatedVoucher.amount,
      WalletTxnSource.GIFT_VOUCHER,
      null,
      (updatedVoucher.code) ? updatedVoucher.code : 'GV-Redemption-CODE-MISSING',
    );

    // 📧 Notify learner
    try {
    await this.notificationService.sendVoucherCreditedEmail({
      recipientEmail: learner.email,
      recipientName: learner.firstName,
      amount: updatedVoucher.amount,
      voucherCode: updatedVoucher.code,
      creditedAt: new Date(),
    });
  } catch (err) {    this.logger.error('Voucher credited email failed', err);
      this.smtpErrorHandler.handle(err, {
        source: 'voucher-credited-email',
        voucherId: updatedVoucher._id,
        learnerId: learner._id,
      });
    }

  }


  /* ------------------------------------
     HELPERS
  ------------------------------------ */
  private generateCode(): string {
    return `GV-${Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()}`;
  }
}
