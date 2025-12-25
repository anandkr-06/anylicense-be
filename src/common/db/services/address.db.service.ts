import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AddressDocument, UserAddress } from '../schemas/address.schema';
import { CreateAddressDto } from '../../../app/address/dto/create-address.dto';
import { Suburb, SuburbDocument } from '../schemas/suburb.schema';

@Injectable()
export class UserAddressDbService {
  constructor(
    @InjectModel(Suburb.name) private _suburbModel: Model<SuburbDocument>,
    @InjectModel(UserAddress.name)
    private readonly addressModel: Model<AddressDocument>,
  ) {}

  public async createAddress(
    dto: CreateAddressDto,
    userId: Types.ObjectId,
  ): Promise<AddressDocument> {
    if (!dto) {
      throw new BadRequestException('Address payload missing');
    }

    if (!dto.suburbId) {
      throw new BadRequestException('Address Suburb missing');
    }

    const suburb = await this._suburbModel
      .findOne({ publicId: dto.suburbId })
      .exec();

    if (!suburb) {
      throw new BadRequestException('Address Suburb Invalid');
    }
    let coordinates = dto.coordinates;

    if (!coordinates || coordinates.length !== 2) {
      coordinates =
        dto.longitude && dto.latitude
          ? [dto.longitude, dto.latitude]
          : undefined;
    }

    try {
      const address = await this.addressModel.create({
        userId: new Types.ObjectId(userId),
        suburbId: suburb._id,
        label: dto.label,
        street: dto.street,
        city: dto.city,
        state: dto.state,
        country: dto.country,
        postalCode: dto.postalCode,
        geometryType: 'Point',
        coordinates,
      });
      return address;
    } catch (error) {
      console.log(error);
      throw Error('Invalid Request');
    }
  }

  public async findAllByUserId(userId: string | Types.ObjectId, params = {}) {
    const _baseFilter = await this._getBaseQuery({ userId, ...params });

    return await this.addressModel
      .find(_baseFilter)
      .sort({ createdAt: -1 })
      .exec();
  }

  public async findById(id: string, params = {}) {
    const _baseFilter = await this._getBaseQuery({ id, ...params });

    return await this.addressModel.findOne(_baseFilter).exec();
  }

  public async findByPublicId(publicId: string, params = {}) {
    const _baseFilter = await this._getBaseQuery({
      publicId: publicId,
      ...params,
    });

    return await this.addressModel.findOne(_baseFilter).exec();
  }

  private async _getBaseQuery(params: Record<string, unknown> = {}) {
    const baseQuery: Record<string, unknown> = {};

    if (params['id']) {
      baseQuery['_id'] = new Types.ObjectId(params['id'] as string);
    }
    if (params['userId']) {
      baseQuery['userId'] = new Types.ObjectId(params['userId'] as string);
    }
    if (params['city']) {
      baseQuery['city'] = params['city'];
    }
    if (params['publicId']) {
      baseQuery['publicId'] = params['publicId'];
    }
    if (params['label']) {
      baseQuery['label'] = params['label'];
    }

    return baseQuery;
  }
  private async findByParams(params: Record<string, unknown> = {}) {
    const baseQuery: Record<string, unknown> = {};

    if (params['id']) {
      baseQuery['_id'] = new Types.ObjectId(params['id'] as string);
    }
    if (params['userId']) {
      baseQuery['userId'] = new Types.ObjectId(params['userId'] as string);
    }
    if (params['city']) {
      baseQuery['city'] = params['city'];
    }
    if (params['publicId']) {
      baseQuery['publicId'] = params['publicId'];
    }
    if (params['label']) {
      baseQuery['label'] = params['label'];
    }

    const hasUniqueKey = !!(params['id'] || params['publicId']);

    let result;

    if (hasUniqueKey) {
      result = await this.addressModel.findOne(baseQuery).lean().exec();
    } else {
      result = await this.addressModel
        .find(baseQuery)
        .sort({ createdAt: -1 })
        .lean()
        .exec();
    }

    return result;
  }

  public async setPrimary(
    id: Types.ObjectId | string,
    userId: Types.ObjectId | string,
  ) {
    const userObjectId = new Types.ObjectId(userId);
    const addressObjectId = new Types.ObjectId(id);

    // Unset other primary addresses
    await this.addressModel.updateMany(
      { userId: userObjectId, _id: { $ne: addressObjectId } },
      { $set: { isPrimary: false } },
    );

    // Set selected address as primary
    const result = await this.addressModel.updateOne(
      { _id: addressObjectId, userId: userObjectId },
      { $set: { isPrimary: true } },
    );

    if (result.matchedCount === 0) {
      throw new BadRequestException('Address not found for this user');
    }

    return result;
  }
}
