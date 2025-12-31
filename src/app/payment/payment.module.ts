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


@Module({
  imports: [
    JwtModule.register({
      secret: process.env['JWT_SECRET'],
      signOptions: { expiresIn: '1h' },
    }),
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: Order.name, schema: OrderSchema },
      { name: User.name, schema: UserSchema },
    ]),
    DbModule,
    OrdersModule,
  ],
  controllers: [PaymentController],
  providers: [StripeService, UserDbService],
  exports: [StripeService],
})
export class PaymentsModule {}
