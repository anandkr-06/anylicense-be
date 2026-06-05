/**
 * Purpose: connect, register, initialize all modules.
 */
import { Module } from '@nestjs/common';
import { AppConfigModule } from './app.config';
import { AuthModule } from './app/auth/auth.module';
import { LoggerModule } from 'nestjs-pino';
import { GlobalExceptionFilter } from 'lib';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserModule } from '@app/users/user.module';
import { AddressModule } from '@app/address/address.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { HealthModule } from '@app/health/health.module';
import { SuburbModule } from '@app/suburbs/suburb.module';
import { PackageModule } from '@app/packages/package.module';
import { InstructorModule } from '@app/instructor/instructor.module';
import { BookingModule } from '@app/booking/booking.module';
import { ServiceAreaModule } from '@app/service-area/service-area.module';
//import { LeanerModule } from '@app/leaner/leaner.module';
import { SearchModule } from '@app/search/search.module';
import { UserLearnersModule } from '@app/userlearners/user.module';
import {OrdersModule} from '@app/order/order.module'
import { PaymentsModule } from '@app/payment/payment.module';
import { WalletModule } from '@app/wallet/wallet.module';
import { FeedbackModule } from '@app/feedback/feedback.module';
import { AddressLocationModule } from '@app/addresslocations/addresslocation.module';
import { CourseModule } from '@app/course/course.module';
import { ReviewsModule } from '@app/reviews/reviews.module';
import { GiftVoucherModule } from '@app/gift-vouchers/gift-vouchers.module';
import { PayoutService } from '@app/payouts/payout.service';
import { PayoutScheduler } from '@app/schedulers/payout.scheduler';
import { PayoutModule } from '@app/payouts/payout.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ContactModule } from '@app/contact/contact.module';
import { InstructorLeadModule } from '@app/instructor/instructor-lead.module';

@Module({
  imports: [
    AppConfigModule,
    ScheduleModule.forRoot(), // ✅ REQUIRED
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('DATABASE_URL'),
      }),
      inject: [ConfigService],
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env['NODE_ENV'] !== 'production'
            ? {
                target: 'pino-pretty',
                options: {
                  singleLine: true,
                  colorize: true,
                  translateTime: 'SYS:standard',
                  ignore: 'pid,hostname',
                },
              }
            : undefined,
      },
    }),
    HealthModule,
    AuthModule,
    UserModule,
    AddressModule,
    SuburbModule,
    PackageModule,
    InstructorModule,
    BookingModule,
    ServiceAreaModule,
    UserLearnersModule,
    SearchModule,
    OrdersModule,
    PaymentsModule,
    WalletModule,
    FeedbackModule,
    AddressLocationModule,
    CourseModule,
    ReviewsModule,
    GiftVoucherModule,
    PayoutModule,
    ContactModule,
    InstructorLeadModule,
  ],
  providers: [
    GlobalExceptionFilter,
    // PayoutService, 
    // PayoutScheduler,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
