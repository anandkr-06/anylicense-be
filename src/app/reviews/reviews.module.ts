// course.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';

import {InstructorReviewController} from '../reviews/controllers/instructor-review.controller'
import {InstructorReviewService} from '../reviews/services/instructor-review.service'

import {InstructorReview, InstructorReviewSchema} from '../reviews/schema/instructor-review.schema'

import { NotificationModule } from 'modules/notifications/notification.module';
import { InstructorProfile, InstructorProfileSchema } from '@common/db/schemas/instructor-profile.schema';



@Module({
  imports: [
    MongooseModule.forFeature([
      { name: InstructorReview.name, schema: InstructorReviewSchema },
      { name: InstructorProfile.name, schema: InstructorProfileSchema },
    ]),
    JwtModule.register({
      secret: process.env['JWT_SECRET'],
      signOptions: { expiresIn: '1h' },
    }),
    NotificationModule
  ],
  controllers: [InstructorReviewController],
  providers: [InstructorReviewService],
})
export class ReviewsModule {}
