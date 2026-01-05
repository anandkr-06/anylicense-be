import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WalletTransaction, WalletTransactionSchema } from '../../common/db/schemas/wallet-transaction.schema';
import { JwtModule } from '@nestjs/jwt';
import { DbModule } from '@common/db/ db.module';
import { Learner, LearnerSchema } from '@common/db/schemas/learner.schema';

import { WalletController } from './controllers/wallet.controller';
import { WalletService } from './services/wallet.service';
import { Order, OrderSchema } from '@common/db/schemas/order.schema';
import { NotificationModule } from 'modules/notifications/notification.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
      { name: Learner.name, schema: LearnerSchema },
    ]),
  ],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService], // 🔥 REQUIRED
})
export class WalletModule {}

