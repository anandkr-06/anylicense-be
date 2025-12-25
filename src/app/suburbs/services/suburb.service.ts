import { Injectable } from '@nestjs/common';
import { SearchPaginationDto } from '../dto/pagination.dto'; // Adjust the path as needed
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SuburbDocument } from '@common/db/schemas/suburb.schema'; 
import { Public } from '@common/decorators/public.decorator';

@Injectable()
export class SuburbService {
  constructor(
    @InjectModel('Suburb')
    private readonly suburbModel: Model<SuburbDocument>,
  ) {}

  public async getAllSuburbs({
    search = '',
    page = 1,
    limit = 10,
  }: SearchPaginationDto = { search: '', page: 1, limit: 10 }) {
  
    const skip = (page - 1) * limit;
    const filter: any = {};
  
    if (search && search.length >= 3) {
      const regex = new RegExp(`^${search}`, 'i');
      filter.$or = [
        { locality: regex },
        { postcode: regex },
      ];
    }
  
    const [data, total] = await Promise.all([
      this.suburbModel
        .find(filter)
        .select({
          _id: 1,          // ✅ remove _id
          locality: 1,
          postcode: 1,
          state: 1,
          long:1,
          lat:1
        })
        .skip(skip)
        .limit(limit)
        .sort({ locality: 1 })
        .lean(),
  
      this.suburbModel.countDocuments(filter),
    ]);
  
    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  
}
