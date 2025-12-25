import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Package, PackageDocument } from '../schemas/package.schema';

@Injectable()
export class PackageDbService {
  constructor(
    @InjectModel(Package.name)
    private readonly model: Model<PackageDocument>,
  ) {}

  public async createPackage(data: Partial<Package>): Promise<PackageDocument> {
    const model = new this.model(data);
    return model.save();
  }

  public async findByPublicId(
    publicId: string,
    userId: string | Types.ObjectId,
  ): Promise<PackageDocument | null> {
    return await this.model
      .findOne({
        publicId: publicId,
        userId: userId,
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  public async findAll(
    userId: Types.ObjectId,
  ): Promise<PackageDocument[] | null> {
    return await this.model
      .find({
        userId: userId,
      })
      .sort({ createdAt: -1 })
      .exec();
  }
}
