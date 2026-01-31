import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { InstructorReview } from '../schema/instructor-review.schema';
import { InstructorProfileDocument, InstructorProfile } from '@common/db/schemas/instructor-profile.schema';
import { PinoLogger } from 'nestjs-pino';
import { ReviewExistsDto } from '../dto/review-exists.dto';

@Injectable()
export class InstructorReviewService {
  constructor(
    @InjectModel(InstructorReview.name)
    private model: Model<InstructorReview>,
    @InjectModel(InstructorProfile.name)
    private instructorProfileModel: Model<InstructorProfileDocument>,
    private readonly logger: PinoLogger
  ) { }

  async exists(dto: ReviewExistsDto) {
    const { instructorId, learnerId, orderId, slotId } = dto;
  
    // ✅ presence check
    if (!instructorId || !learnerId || !orderId || !slotId) {
      throw new BadRequestException(
        'Missing required fields: ' + JSON.stringify(dto),
      );
    }
  
    // ✅ validity check
    const exists = await this.model.exists({
      instructorId: this.toObjectId(instructorId, 'instructorId'),
      learnerId: this.toObjectId(learnerId, 'learnerId'),
      orderId: this.toObjectId(orderId, 'orderId'),
      slotId: this.toObjectId(slotId, 'slotId'),
    });
  
    return {
      canReview: exists === null,
    };
  }
  
  
  
  private toObjectId(id: string, field: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${field}: ${id}`);
    }
    return new Types.ObjectId(id);
  }

  async create(dto: {
    instructorId: string;
    learnerId: string;
    orderId: string;
    slotId: string;
    rating: number;
    comment: string;
  }) {
    const filter = {
      instructorId: new Types.ObjectId(dto.instructorId),
      learnerId: new Types.ObjectId(dto.learnerId),
      orderId: new Types.ObjectId(dto.orderId),
      slotId: new Types.ObjectId(dto.slotId),
    };
  
    // 1️⃣ Check duplicate (API level)
    const exists = await this.model.exists(filter);
    if (exists) {
      throw new BadRequestException({
        message: 'You have already reviewed this class',
        errorCode: 'REVIEW_ALREADY_SUBMITTED',
      });
    }
  
    // 2️⃣ Create review
    const review = await this.model.create({
      ...filter,
      rating: dto.rating,
      comment: dto.comment,
    });
  
    // 3️⃣ Update instructor rating
    const summary = await this.getSummary(filter.instructorId);
  
    await this.instructorProfileModel.updateOne(
      { userId: filter.instructorId }, // ✅ THIS IS THE FIX
      {
        $set: {
          rating: {
            avg: Number(summary.avgRating.toFixed(1)),
            total: summary.totalReviews,
          },
        },
      },
    );
  
    
    return review;
  }
  




findByInstructor(instructorId: string) {
  const filter: any = {};

  if (instructorId.toLowerCase() !== 'all') {
    filter.instructorId = new Types.ObjectId(instructorId);
  }

  return this.model
    .find(filter)
    .populate({
      path: 'learnerId',               // ✅ MUST match schema
      select: 'firstName profileImage -_id',
    })
    .select('rating comment learnerId createdAt') // ✅ keep needed fields
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();
}




async getSummary(instructorId: string | Types.ObjectId) {
  const instructorObjectId =
    instructorId instanceof Types.ObjectId
      ? instructorId
      : new Types.ObjectId(instructorId);

  const result = await this.model.aggregate([
    { $match: { instructorId: instructorObjectId } },
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
