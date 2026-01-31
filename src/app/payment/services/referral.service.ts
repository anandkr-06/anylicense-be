import {
  Injectable, 
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId, Types } from 'mongoose';

import { LearnerDocument,Learner } from '@common/db/schemas/learner.schema';
import { Referral } from '@common/db/schemas/referral.schema';

@Injectable()
export class ReferralService {
  constructor(
    @InjectModel(Referral.name)
    private referralModel: Model<Referral>,
    @InjectModel(Learner.name)
    private learnerModel: Model<LearnerDocument>,
  ) {}

  async rewardReferral(learnerId: Types.ObjectId,
    orderId: Types.ObjectId) {
    const referral = await this.referralModel.findOneAndUpdate(
      {
        refereeId: learnerId,
        status: 'REGISTERED',
      },
      {
        $set: {
          status: 'REWARDED',
          rewardedAt: new Date(),
          rewardedForOrderId: orderId,
        },
      },
      { new: true }
    );

    if (!referral) return;

    await this.learnerModel.updateOne(
      { _id: referral.referrerId },
      { $inc: { walletBalance: referral.rewardAmount } }
    );
  }
}
