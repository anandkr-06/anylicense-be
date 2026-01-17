import { Injectable } from '@nestjs/common';
import { SearchPaginationDto } from '../dto/pagination.dto'; // Adjust the path as needed
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { AddressLocation } from '@common/db/schemas/addresslocation.schema';


@Injectable()
export class AddressLocationService {
  constructor(
    @InjectModel('AddressLocation')
    private readonly addressLocationModel: Model<AddressLocation>,
  ) {}

  public async getAllTestAddress({
    search = '',
    page = 1,
    limit = 10,
  }: SearchPaginationDto = { search: '', page: 1, limit: 10 }) {
  
    const skip = (page - 1) * limit;
    const filter: any = {};
  
    if (search && search.length >= 3) {
      const regex = new RegExp(`^${search}`, 'i');
    
      filter.$or = [
        { address: regex },
        {
          $expr: {
            $regexMatch: {
              input: { $toString: '$postCode' },
              regex,
            },
          },
        },
        {
          $expr: {
            $regexMatch: {
              input: { $toString: '$state' },
              regex,
            },
          },
        },
        {
          $expr: {
            $regexMatch: {
              input: { $toString: '$locations' },
              regex,
            },
          },
        },
        {
          $expr: {
            $regexMatch: {
              input: { $toString: '$suburb' },
              regex,
            },
          },
        },
      ];
    }
    
    
    const [data, total] = await Promise.all([
      this.addressLocationModel
        .find(filter)
        .select({
          _id: 1,          // ✅ remove _id
          address: 1,
          location: 1,
          state: 1,
          suburb:1,
          postCode:1
        })
        .skip(skip)
        .limit(limit)
        .sort({ locality: 1 })
        .lean(),
  
      this.addressLocationModel.countDocuments(filter),
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
