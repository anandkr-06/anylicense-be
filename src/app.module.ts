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

@Module({
  imports: [
    AppConfigModule,
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
  ],
  providers: [
    GlobalExceptionFilter,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
