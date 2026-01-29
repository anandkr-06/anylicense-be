import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { InstructorReview } from '../schema/instructor-review.schema';
import { InstructorProfileDocument, InstructorProfile } from '@common/db/schemas/instructor-profile.schema';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class InstructorReviewService {
  constructor(
    @InjectModel(InstructorReview.name)
    private model: Model<InstructorReview>,
    @InjectModel(InstructorProfile.name)
    private instructorProfileModel: Model<InstructorProfileDocument>,
    private readonly logger: PinoLogger
  ) { }

  async create(dto: any) {
    try {
      const review = await this.model.findOneAndUpdate(
        {
          instructorId: dto.instructorId,
          userId: dto.userId,
        },
        {
          $set: {
            rating: dto.rating,
            comment: dto.comment,
          },
        },
        {
          upsert: true,
          new: true,
        },
      );
  
      // ✅ NOW summary will be correct
      const summary = await this.getSummary(dto.instructorId);
  
      const updateResult = await this.instructorProfileModel.updateOne(
        { userId: dto.instructorId },
        {
          $set: {
            rating: {
              avg: summary.avgRating,
              total: summary.totalReviews,
            },
          },
        },
      );
  
      console.log('Profile update:', updateResult);
      return review;
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new BadRequestException({
          message: 'You have already reviewed this instructor',
          errorCode: 'DUPLICATE_REVIEW',
        });
      }
      throw error;
    }
  }
  





  findByInstructor(instructorId: string) {
    const filter: any = {};

    if (instructorId.toLowerCase() !== 'all') {
      filter.instructorId = instructorId;
    }

    return this.model
      .find(filter)
      .select('-_id -instructorId -createdAt -updatedAt -__v')
      .populate({
        path: 'userId',
        select: 'firstName profileImage -_id',
      })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
  }





  async getSummary(instructorId: string) {
    const result = await this.model.aggregate([
      { $match: { instructorId } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          avgRating: { $round: ['$avgRating', 1] },
          totalReviews: 1,
        },
      },
    ]);

    return result[0] ?? { avgRating: 0, totalReviews: 0 };
  }

}
