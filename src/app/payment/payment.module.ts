import { Module } from '@nestjs/common';
import { UserDbService } from '../../common/db/services/user.db.service';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { DbModule } from '@common/db/ db.module';
import { PaymentSchema, Payment } from '@common/db/schemas/payment.schema';
import { OrderSchema, Order } from '@common/db/schemas/order.schema';
import { UserSchema, User } from '@common/db/schemas/user.schema';
import { PaymentController } from './controllers/payment.controller'; 
import { StripeService } from './services/payment.service'; 
import { OrdersModule } from '@app/order/order.module';
import { StripeWebhookController } from './controllers/webhook.controller';
import {InstructorModule} from '@app/instructor/instructor.module';
import { InstructorProfile, InstructorProfileSchema } from '@common/db/schemas/instructor-profile.schema';
import { Learner, LearnerSchema } from '@common/db/schemas/learner.schema';
import { WalletModule } from '@app/wallet/wallet.module';
import { ReferralService } from './services/referral.service';
import { Referral, ReferralSchema } from '@common/db/schemas/referral.schema';
import { PrivateOrder, PrivateOrderSchema } from '@common/db/schemas/private-order.schema';
import { GiftVoucher, GiftVoucherSchema } from '@app/gift-vouchers/schema/gift-voucher-schema';
import { GiftVoucherService } from '@app/gift-vouchers/services/gift-voucher-service';
import { GiftVoucherModule } from '@app/gift-vouchers/gift-vouchers.module';
import { NotificationModule } from 'modules/notifications/notification.module';
import { SmtpModule } from '@common/smtp/smtp.module';
import { LearnerService } from '@app/userlearners/services/leaner.service';
import { WalletTransaction, WalletTransactionSchema } from '@common/db/schemas/wallet-transaction.schema';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env['JWT_SECRET'],
      signOptions: { expiresIn: '1h' },
    }),
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: Order.name, schema: OrderSchema },
      { name: PrivateOrder.name, schema: PrivateOrderSchema },
      { name: User.name, schema: UserSchema },
      {
        name: InstructorProfile.name,
        schema: InstructorProfileSchema,
      },
      { name: Learner.name, schema: LearnerSchema },
      { name: Referral.name, schema: ReferralSchema },
      { name: GiftVoucher.name, schema: GiftVoucherSchema },
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
      
    ]),
    DbModule,
    OrdersModule,
    InstructorModule,
    WalletModule,
    GiftVoucherModule,
    NotificationModule,
    SmtpModule,
  ],
  controllers: [PaymentController,StripeWebhookController],
  providers: [StripeService, UserDbService, ReferralService, GiftVoucherService, LearnerService],
  exports: [StripeService],
})
export class PaymentsModule {}
