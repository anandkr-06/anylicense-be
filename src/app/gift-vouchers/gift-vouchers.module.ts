// course.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';

import { NotificationModule } from 'modules/notifications/notification.module';
import { SmtpModule } from '@common/smtp/smtp.module';
import { SmtpErrorHandlerService } from '@common/smtp/smtp-error-handler.service';
import { PinoLogger } from 'nestjs-pino';
import { GiftVoucherService } from '../gift-vouchers/services/gift-voucher-service';
import { GiftVoucherController } from './controllers/gift-voucher-controller';
import { GiftVoucher, GiftVoucherSchema } from './schema/gift-voucher-schema';
import { UserLearnersModule } from '@app/userlearners/user.module';
import { WalletModule } from '@app/wallet/wallet.module';
import { Learner, LearnerSchema } from '@common/db/schemas/learner.schema';
import { LearnerService } from '@app/userlearners/services/leaner.service';
import { Order, OrderSchema } from '@common/db/schemas/order.schema';
import { Referral, ReferralSchema } from '@common/db/schemas/referral.schema';




@Module({
    imports: [
        JwtModule.register({
      secret: process.env['JWT_SECRET'],
      signOptions: { expiresIn: '1h' },
    }),
      MongooseModule.forFeature([
        { name: GiftVoucher.name, schema: GiftVoucherSchema },
        {name:Learner.name,schema:LearnerSchema},
        {name:Order.name,schema:OrderSchema},
        {name:Referral.name,schema:ReferralSchema},
      ]),
      forwardRef(() => WalletModule),
      forwardRef(() => UserLearnersModule),
      NotificationModule,
      SmtpModule,
    ],
    controllers: [GiftVoucherController],
    providers: [
      GiftVoucherService,
      SmtpErrorHandlerService,
      PinoLogger, 
    ],
    exports: [GiftVoucherService], // 🔥 REQUIRED
  })
  export class GiftVoucherModule {}
  

  