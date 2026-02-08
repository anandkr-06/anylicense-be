import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Learner, LearnerSchema } from '../../common/db/schemas/learner.schema';
import { JwtModule } from '@nestjs/jwt';
import { DbModule } from '@common/db/ db.module';
import { LearnerController } from './controllers/learner.controller';
import { LearnerService } from './services/leaner.service';
import { Order, OrderSchema } from '@common/db/schemas/order.schema';
import { NotificationModule } from 'modules/notifications/notification.module';
import { Referral, ReferralSchema } from '@common/db/schemas/referral.schema';
import { GiftVoucherModule } from '@app/gift-vouchers/gift-vouchers.module';


@Module({
  imports: [
    JwtModule.register({
      secret: process.env['JWT_SECRET'],
      signOptions: { expiresIn: '1h' },
    }),
    MongooseModule.forFeature([
      { name: Learner.name, schema: LearnerSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Referral.name, schema: ReferralSchema },
      
    ]),
    DbModule,
    NotificationModule,
    
    forwardRef(() => UserLearnersModule),
    forwardRef(() => GiftVoucherModule), // 🔥 ONLY THIS
  ],
  controllers: [LearnerController],
  providers: [LearnerService],
  exports: [LearnerService],
})
export class UserLearnersModule {}