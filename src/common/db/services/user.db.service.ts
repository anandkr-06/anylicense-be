/* eslint-disable max-lines-per-function */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { UserRole } from '@constant/users';
import { InstructorSearchDto } from '@app/instructor/dto/search.dto';

@Injectable()
export class UserDbService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  public async findUniqueCheck(
    email: string,
    role: UserRole,
  ): Promise<UserDocument | null> {
    return this.userModel.findOne({ email, role: role }).exec();
  }
  public async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  public async findByLeanerPublicId(
    publicId: string,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ publicId: publicId, role: UserRole.LEARNER })
      .exec();
  }

  public async findByInstructorPublicId(
    publicId: string,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ publicId: publicId, role: UserRole.INSTRUCTOR })
      .exec();
  }

  public async createUser(data: Partial<UserDocument>): Promise<UserDocument> {
    const user = new this.userModel(data);
    return user.save();
  }

  public async addAddressToUser(
    userId: Types.ObjectId,
    addressId: Types.ObjectId,
  ): Promise<UserDocument | null> {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { $addToSet: { addresses: new Types.ObjectId(addressId) } },
      { new: true },
    );
    return user;
  }

  public async findByPublicId(
    publicId: string,
    params = {},
  ): Promise<UserDocument | null> {
    return this.findByParams({ publicId, ...params });
  }

  public async findOneAndUpdate(
    email: string,
    params = {},
  ): Promise<UserDocument | null> {
    return this.userModel.findOneAndUpdate({ email }, params, { new: true });
  }

  private async findByParams(params: Record<string, unknown> = {}) {
    const baseQuery: Record<string, unknown> = {};

    if (params['publicId']) {
      baseQuery['publicId'] = params['publicId'];
    }

    let query = this.userModel.findOne(baseQuery);

    if (params['withAddress'] === true) {
      query = query.populate('addresses');
    }

    const user = await query.exec();

    return user;
  }

  public async findAllInstructor(
    filters: InstructorSearchDto,
  ): Promise<UserDocument[] | null> {
    const match: any = { role: UserRole.INSTRUCTOR };

    const pipeline: any[] = [{ $match: match }];

    // Suburb filter
    if (filters.suburbId) {
      pipeline.push({
        $lookup: {
          from: 'suburbs',
          let: { suburbId: filters.suburbId },
          pipeline: [
            { $match: { $expr: { $eq: ['$publicId', '$$suburbId'] } } },
            { $project: { _id: 1 } },
          ],
          as: 'suburbDocs',
        },
      });

      pipeline.push({
        $addFields: { suburbId: { $arrayElemAt: ['$suburbDocs._id', 0] } },
      });

      pipeline.push({
        $match: {
          $expr: {
            $and: [
              { $ne: ['$suburbId', null] },
              { $in: ['$suburbId', { $ifNull: ['$serviceArea', []] }] },
            ],
          },
        },
      });
    }

    // Slots filter
    pipeline.push({
      $lookup: {
        from: 'slots',
        localField: '_id',
        foreignField: 'instructorId',
        as: 'slots',
      },
    });

    if (filters.date) {
      pipeline.push({
        $addFields: {
          slots: {
            $filter: {
              input: '$slots',
              as: 'slot',
              cond: { $eq: ['$$slot.date', filters.date] },
            },
          },
        },
      });

      pipeline.push({ $match: { 'slots.0': { $exists: true } } });
    }

    // Packages filter
    pipeline.push({
      $lookup: {
        from: 'packages',
        localField: '_id',
        foreignField: 'userId',
        as: 'packages',
      },
    });

    if (filters.transmissionType) {
      pipeline.push({
        $addFields: {
          packages: {
            $filter: {
              input: '$packages',
              as: 'pkg',
              cond: {
                $eq: ['$$pkg.transmissionType', filters.transmissionType],
              },
            },
          },
        },
      });
      pipeline.push({ $match: { 'packages.0': { $exists: true } } });
    }

    return this.userModel.aggregate(pipeline);
  }

  public async updateServiceArea(
    id: Types.ObjectId,
    serviceArea: Array<string>,
  ): Promise<UserDocument | null> {
    return this.userModel.findOneAndUpdate(
      { _id: id },
      {
        $set: { serviceArea: serviceArea },
      },
      { new: true, upsert: false },
    );
  }
}
