import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException, ConflictException, NotFoundException
} from '@nestjs/common';
import { UserDbService } from '@common/db/services/user.db.service';
import { InstructorProfile, InstructorProfileDocument } from '@common/db/schemas/instructor-profile.schema';
import { RegisterUserDto } from '../dto/register-user.dto';
import { comparePassword, hashPassword } from '@common/helpers/bcrypt.helper';
import { successResponse } from '@common/helpers/response.helper';
import { UserDocument } from '@common/db/schemas/user.schema';
import { UserResponse } from '@interfaces/user.interface';
import { UserRole } from '@constant/users';
import { UserAddressDbService } from '@common/db/services/address.db.service';
import { ApiResponse } from 'interfaces/api-response.interfaces';
import { createDefaultPackagesForInstructor } from '@common/helpers/default-package.helper';
import { Package, PackageDocument } from '@common/db/schemas/package.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { SuburbDbService } from '@common/db/services/suburb.db.service';
import { AddressDocument } from '@common/db/schemas/address.schema';
import { isDefined } from 'class-validator';
import { TransmissionType } from '@constant/packages';
import { VehicleInterface } from '@interfaces/vehicle.interface';
import { UpdateAdditionalInfoDto } from '@app/instructor/dto/update-instructor-profile.dto';
import { UpdateVehicleDetailsDto } from '../dto/vehicle-details.dto';

@Injectable()
export class MoreProfile {
  constructor(
    private readonly userDbService: UserDbService,
    private readonly suburbDbService: SuburbDbService,
    @InjectModel(InstructorProfile.name) private instructorProfileModel: Model<InstructorProfileDocument>,
    
  ) {}

  private async _buildUserResponse(
  user: InstructorProfileDocument,
  params: {
    address?: boolean;
    packages?: boolean;
  } = {},
): Promise<UserResponse> {

  const obj = user.toObject({
    versionKey: false,
    transform: (_, ret) => {
      //if(ret){delete ret._id}
      return ret;
    },
  });

  // if (!params.address) {
  //   delete obj.address;
  // }

  // if (!params.packages) {
  //   delete obj.packages;
  // }

  return obj as UserResponse;
}

public async getMoreProfileDetails(
  userId: string,
): Promise<ApiResponse<UserResponse>> {

  const user = await this.instructorProfileModel
    .findOne({ userId })
    .exec();

  if (!user) {
    throw new NotFoundException('User not found');
  }

  return successResponse(
    await this._buildUserResponse(user, {
      address: true,
      packages: true,
    }),
  );
}


}
