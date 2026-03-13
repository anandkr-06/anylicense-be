import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PayoutService } from './payout.service';
import { PayoutController } from './payout.controller';

import { Payout, PayoutSchema } from '@common/db/schemas/payout.schema';

import {
  InstructorTransaction,
  InstructorTransactionSchema,
} from '@common/db/schemas/instructor-transactions.schema';
import { StripeService } from './stripe.service';
import { User, UserSchema } from '@common/db/schemas/user.schema';
import { InstructorProfile, InstructorProfileSchema } from '@common/db/schemas/instructor-profile.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payout.name, schema: PayoutSchema },
      { name: InstructorTransaction.name, schema: InstructorTransactionSchema },
      { name: User.name, schema: UserSchema },
      { name: InstructorProfile.name, schema: InstructorProfileSchema },
      
    ]),
    
  ],
  controllers: [PayoutController],
  providers: [PayoutService, StripeService],
  exports: [PayoutService],
})
export class PayoutModule {}