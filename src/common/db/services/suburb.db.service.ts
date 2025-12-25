import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Suburb, SuburbDocument } from '../schemas/suburb.schema';

@Injectable()
export class SuburbDbService {
  constructor(
    @InjectModel(Suburb.name)
    private readonly suburbModel: Model<SuburbDocument>,
  ) {}

  public async findAll() {
    return await this.suburbModel.find().sort({ createdAt: -1 }).exec();
  }
  
  public async findByPublicId(publicId: string) {
    return await this.suburbModel
      .findOne({ _id: publicId })
      .sort({ createdAt: -1 })
      .exec();
  }
}
