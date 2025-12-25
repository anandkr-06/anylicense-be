import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserAddressDbService } from '../../../common/db/services/address.db.service';
import { CreateAddressDto } from '../dto/create-address.dto';

import { Types } from 'mongoose';
import { UserDbService } from '@common/db/services/user.db.service';
import { CustomRequest } from '@common/types/express';
import { successResponse } from '@common/helpers/response.helper';
import { AddressResponse } from '@interfaces/address.interface';

import { AddressDocument } from '@common/db/schemas/address.schema';

@Injectable()
export class UserAddressService {
  constructor(
    private readonly userAddressDbService: UserAddressDbService,
    private readonly userDbService: UserDbService,
  ) {}

  // public async createAddress(req: CustomRequest, payload: CreateAddressDto) {
  //   if (!req.user) {
  //     throw new UnauthorizedException('Invalid token');
  //   }

  //   const user = await this.validateUser(req.user.email);

  //   // let coordinates = payload.coordinates;

  //   // if (!coordinates) {
  //   //   const fullAddress = `${dto.street}, ${dto.city}, ${dto.state}, ${dto.country}`;
  //   // coordinates = await getCoordinatesFromAddress(fullAddress);
  //   // }

  //   const address = await this.userAddressDbService.createAddress(
  //     payload,
  //     user._id,
  //   );
  //   await this.userDbService.addAddressToUser(user._id, address._id);

  //   return successResponse({}, 'Created successfully');
  // }

  // public async getAllAddress(req: CustomRequest) {
  //   if (!req.user) {
  //     throw new UnauthorizedException('Invalid token');
  //   }

  //   try {
  //     const user = await this.validateUser(req.user.email);

  //     const userAddress = await this.userAddressDbService.findAllByUserId(
  //       user._id,
  //     );
  //     return successResponse(userAddress);
  //   } catch {
  //     throw new InternalServerErrorException();
  //   }
  // }

  // public async getAddress(req: CustomRequest, addressId: string) {
  //   if (!req.user) {
  //     throw new UnauthorizedException('Invalid token');
  //   }

  //   const user = await this.validateUser(req.user.email);

  //   const address = await this.validateAddress(addressId, user._id);

  //   if (!address) throw new NotFoundException('Address not found');

  //   return successResponse(address);
  // }

  // public async setPrimary(req: CustomRequest, addressId: string) {
  //   if (!req.user) {
  //     throw new UnauthorizedException('Invalid token');
  //   }

  //   const user = await this.validateUser(req.user.email);

  //   const address = await this.validateAddress(addressId, user._id);

  //   await this.userAddressDbService.setPrimary(address._id, user._id);

  //   return successResponse({}, 'Primary address updated');
  // }

  // public async validateUser(email: string) {
  //   const userDetail = await this.userDbService.findByEmail(email);

  //   if (!userDetail) {
  //     throw new UnauthorizedException('Invalid user');
  //   }
  //   return userDetail;
  // }

  // public async validateAddress(
  //   addressPublicId: string,
  //   userId: Types.ObjectId | string,
  // ) {
  //   const address = await this.userAddressDbService.findByPublicId(
  //     addressPublicId,
  //     { userId },
  //   );

  //   if (!address) {
  //     throw new UnauthorizedException('Address not found');
  //   }
  //   return address;
  // }
}
