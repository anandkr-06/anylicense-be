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
      return await this.model.create(data);
    } catch (err) {
      if (err === 11000) {
        throw new ConflictException('You already reviewed this instructor');
      }
      throw err;
    }
  }

  findByInstructor(instructorId: string) {
    return this.model
      .find({ instructorId })
      .populate('userId', 'name avatar')
      .sort({ createdAt: -1 });
  }

  async getSummary(instructorId: string) {
    const result = await this.model.aggregate([
      { $match: { instructorId: new Types.ObjectId(instructorId) } },
      {
        $group: {
          _id: '$instructorId',
          avgRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 }
        }
      }
    ]);

    return result[0] || { avgRating: 0, totalReviews: 0 };
  }
}
