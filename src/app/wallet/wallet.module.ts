import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WalletTransaction, WalletTransactionSchema } from '../../common/db/schemas/wallet-transaction.schema';

import { Learner, LearnerSchema } from '@common/db/schemas/learner.schema';

import { WalletController } from './controllers/wallet.controller';
import { WalletService } from './services/wallet.service';
import { Order, OrderSchema } from '@common/db/schemas/order.schema';
import { NotificationModule } from 'modules/notifications/notification.module';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';



@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
      { name: Learner.name, schema: LearnerSchema },
      
    ]),
  ],
  controllers: [WalletController], // ✅ REQUIRED
  providers: [WalletService,JwtService,JwtAuthGuard], // ✅ REQUIRED
  exports: [WalletService], // ✅ REQUIRED
})
export class WalletModule {}


