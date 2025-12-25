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

@Injectable()
export class UserService {
  constructor(
    private readonly userDbService: UserDbService,
    private readonly userAddressDbService: UserAddressDbService,
    private readonly suburbDbService: SuburbDbService,
    @InjectModel(Package.name) private packageModel: Model<PackageDocument>,
  ) {}

  public async register(
    payload: RegisterUserDto,
    role: UserRole,
    file?: Express.Multer.File,
  ): Promise<ApiResponse<UserResponse>> {
    const existingUser = await this.userDbService.findUniqueCheck(
      payload.email,
      UserRole.INSTRUCTOR,
    );
    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    try {
      let imageBase64: string | null = null;

      if (file) {
        const base64String = file.buffer.toString('base64');
        const mimeType = file.mimetype;
        imageBase64 = `data:${mimeType};base64,${base64String}`;
      }

      const hashedPassword = await hashPassword(payload.password);

      const data = this.gettingUserValue(payload, imageBase64);
      const user = await this.userDbService.createUser({
        ...data,
        ...{
          role: role,
        },
        password: hashedPassword,
      });

      if (UserRole.INSTRUCTOR === role) {
        const packages = createDefaultPackagesForInstructor(
          user._id,
          payload.transmissionType,
        );
        await this.packageModel.insertMany(packages);
      }

      let address = null;
      if (payload.address && user._id && role === UserRole.INSTRUCTOR) {
        address = await this.userAddressDbService.createAddress(
          payload.address,
          user._id,
        );
        await this.userDbService.addAddressToUser(user._id, address._id);
      }

      return successResponse(await this._buildUserRespons(user));
    } catch (err: unknown) {
      throw new InternalServerErrorException((err as Error).message);
    }
  }

  public async getUserById(
    publicId: string,
  ): Promise<ApiResponse<UserResponse>> {
    const user = await this.userDbService.findByPublicId(publicId, {
      withAddress: true,
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return successResponse(
      await this._buildUserRespons(user, {
        address: true,
        packages: true,
      }),
    );
  }

  public async getUserByEmail(email: string): Promise<UserDocument | null> {
    const user = await this.userDbService.findByEmail(email);
    if (!user) return null;

    return user;
  }
  public async validateUser(
    email: string,
    password: string,
  ): Promise<UserDocument | null> {
    const user = await this.userDbService.findByEmail(email);
    if (!user) return null;

    const match = await comparePassword(password, user.password);
    return match ? user : null;
  }

  public async findOneAndUpdateByEmail(
    email: string,
    updateData: UserDocument | Partial<UserDocument>,
  ): Promise<UserDocument | null> {
    return this.userDbService.findOneAndUpdate(email, updateData);
  }

  private async _buildUserRespons(
    user: UserDocument,
    params: Record<string, unknown> = {},
  ): Promise<UserResponse> {
    let address: Array<AddressDocument> = [];
    let packages: Array<PackageDocument> = [];

    if (isDefined(params['address']) && params['address'] === true) {
      address = await this.userAddressDbService.findAllByUserId(user._id);
    }

    if (isDefined(params['packages']) && params['packages'] === true) {
      packages = await this.packageModel
        .find({
          userId: user._id,
        })
        .exec();
    }

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
      address: address,
      packages: packages,
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
