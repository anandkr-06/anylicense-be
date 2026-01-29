import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { InstructorReview } from '../schema/instructor-review.schema';

@Injectable()
export class InstructorReviewService {
  constructor(
    @InjectModel(InstructorReview.name)
    private model: Model<InstructorReview>
  ) {}

  async create(data: any) {
    try {
      await this.model.create(data);
      return {
        success: true,
        message: 'Review sumitted successfully',
      };
    } catch (err) {
      if (err === 11000) {
        throw new ConflictException('You already reviewed this instructor');
      }
      throw err;
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
