import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserDbService } from '@common/db/services/user.db.service';
import { RegisterUserDto } from '../dto/register-user.dto';
import { comparePassword, hashPassword } from '@common/helpers/bcrypt.helper';
import { successResponse } from '@common/helpers/response.helper';
import { UserDocument } from '@common/db/schemas/user.schema';
import { UserResponse } from '@interfaces/user.interface';
import { UserRegistrationType, UserRole } from '@constant/users';
import { ApiResponse } from 'interfaces/api-response.interfaces';
import { Package, PackageDocument } from '@common/db/schemas/package.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { SuburbDbService } from '@common/db/services/suburb.db.service';
import {
  AddressDocument,
  UserAddress,
} from '@common/db/schemas/address.schema';
import { isDefined } from 'class-validator';
import { TransmissionType } from '@constant/packages';
import { VehicleInterface } from '@interfaces/vehicle.interface';
import {
  SelfLeanerRegisterDto,
  SomeOneLeanerRegisterDto,
} from '../dto/leaner.dto';

@Injectable()
export class LeanerService {
  constructor(
    private readonly userDbService: UserDbService,
    private readonly suburbDbService: SuburbDbService,
    @InjectModel(UserAddress.name) private addressModel: Model<AddressDocument>,
    @InjectModel(Package.name) private packageModel: Model<PackageDocument>,
  ) {}

  public async registerSelf(
    payload: SelfLeanerRegisterDto,
  ): Promise<ApiResponse<UserResponse>> {
    const existingUser = await this.userDbService.findUniqueCheck(
      payload.email,

      UserRole.LEARNER,
    );
    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    try {
      const suburb = await this.suburbDbService.findByPublicId(
        payload.address.suburbId,
      );

      if (!suburb) throw new BadRequestException(`Suburb  not found`);

      const hashedPassword = await hashPassword(payload.password);
      const data = {
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        mobileNumber: payload.mobileNumber,
        dob: payload.dob,
        bestDescribe: payload.bestDescribe,
        isTncApproved: payload.isTncApproved,
        isNotificationSent: payload.isNotificationSent,
      };

      const user = await this.userDbService.createUser({
        ...data,
        ...{
          role: UserRole.LEARNER,
        },
        password: hashedPassword,
      });

      await this.addressModel.insertOne({
        userId: user._id,
        suburbId: suburb._id,
        pickUpAddress: payload.address.pickUpAddress,
      });

      return successResponse(await this._buildUserRespons(user));
    } catch (err: unknown) {
      throw new InternalServerErrorException((err as Error).message);
    }
  }

  public async registerSomeOne(
    payload: SomeOneLeanerRegisterDto,
  ): Promise<ApiResponse<UserResponse>> {
    const existingUser = await this.userDbService.findUniqueCheck(
      payload.email,
      UserRole.LEARNER,
    );
    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    try {
      const suburb = await this.suburbDbService.findByPublicId(
        payload.address.suburbId,
      );

      if (!suburb) throw new BadRequestException(`Suburb  not found`);

      const hashedPassword = await hashPassword(payload.password);
      const data = {
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        mobileNumber: payload.mobileNumber,
        dob: payload.dob,
        bestDescribe: payload.bestDescribe,
        isTncApproved: payload.isTncApproved,
        isNotificationSent: payload.isNotificationSent,
        registrationType: UserRegistrationType.SOMEONE_ELSE,
        purchaserDetail: { ...payload.purchaserDetail },
      };

      const user = await this.userDbService.createUser({
        ...data,
        ...{
          role: UserRole.LEARNER,
        },
        password: hashedPassword,
      });

      await this.addressModel.insertOne({
        userId: user._id,
        suburbId: suburb._id,
        pickUpAddress: payload.address.pickUpAddress,
      });

      return successResponse(await this._buildUserRespons(user));
    } catch (err: unknown) {
      throw new InternalServerErrorException((err as Error).message);
    }
  }

  private async _buildUserRespons(
    user: UserDocument,
    params: Record<string, unknown> = {},
  ): Promise<UserResponse> {
    return {
      id: user.publicId,
      email: user.email,
      publicId: user.publicId,
      role: user.role,
      subject: user.subject,
      description: user.description,
      mobileNumber: user.mobileNumber,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`,
      initials: this.getInitials(user.firstName, user.lastName),
    };
  }
  private getInitials(firstname: string, lastname?: string): string {
    const first = firstname?.[0] ?? '';
    const last = lastname?.[0] ?? '';
    return `${first}${last}`.toUpperCase();
  }

  private gettingUserValue(
    payload: RegisterUserDto,
    profileImage: string | null,
  ): Partial<UserDocument> {
    const vehicleDetail: VehicleInterface[] = [];
    const defaultVehicleValue = {
      registrationNumber: '',
      licenceCategory: '',
      make: '',
      model: '',
      color: '',
      year: 1990,
      ancapSafetyRating: '',
      hasDualControls: false,
    };
    const baseVehicle = {
      year: 1990,
      hasDualControls: false,
    };
    const transmissionType = payload.transmissionType;
    if (transmissionType === TransmissionType.AUTO) {
      vehicleDetail.push({
        ...baseVehicle,
        ...{ transmissionType: TransmissionType.AUTO },
      });
    } else if (transmissionType === TransmissionType.MANUAL) {
      vehicleDetail.push({
        ...baseVehicle,
        ...{ transmissionType: TransmissionType.AUTO },
      });
    } else {
      vehicleDetail.push(
        {
          ...baseVehicle,
          ...{ transmissionType: TransmissionType.AUTO },
        },
        {
          ...baseVehicle,
          ...{ transmissionType: TransmissionType.MANUAL },
        },
      );
    }

    const user = {
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      gender: payload.gender,
      mobileNumber: payload.mobileNumber,
      dob: payload.dob,
      subject: payload.subject,
      description: payload.description,
      isTncApproved: payload.isTncApproved,
      isNotificationSent: payload.isNotificationSent,
      profileImage: profileImage,
      vehicles: vehicleDetail,
      financialDetail: {
        bankName: '',
        accountHolderName: '',
        accountNumber: '',
        bsbNumber: '',
        abnNumber: '',
        businessName: '',
      },
    };

    return user;
  }
}
