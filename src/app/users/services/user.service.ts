import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException, ConflictException
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
export class UserService {
  constructor(
    private readonly userDbService: UserDbService,
    private readonly userAddressDbService: UserAddressDbService,
    private readonly suburbDbService: SuburbDbService,
    @InjectModel(InstructorProfile.name) private instructorProfileModel: Model<InstructorProfileDocument>,
    @InjectModel(Package.name) private packageModel: Model<PackageDocument>,
  ) {}

  public async register(
    dto: RegisterUserDto,
    // role: UserRole,
    // file?: Express.Multer.File,
  ): Promise<ApiResponse<UserResponse>> {
    
    // const existingUser = await this.userDbService.findUniqueCheck(
    //   dto.email,
    //   UserRole.INSTRUCTOR,
    // );
    // if (existingUser) {
    //   throw new BadRequestException('Email already exists');
    // }

    try {
      const hashedPassword = await hashPassword(dto.password);

      
      const user = await this.userDbService.createUser({
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        mobileNumber: dto.mobileNumber,
        password: hashedPassword,
        gender: dto.gender,
        dob: dto.dob,
        description: dto.description,
        postCode: dto.postCode,
        isTncApproved: dto.isTncApproved,
        isNotificationSent: dto.isNotificationSent,
        isActive: true
      });

      await this.instructorProfileModel.create({
        userId: user._id,
        suburbs:["Sydney", "Parramatta"],
        availability: ["AM", "PM"],
        isVerified: false
      });

      // if (UserRole.INSTRUCTOR === role) {
      //   const packages = createDefaultPackagesForInstructor(
      //     user._id,
      //     payload.transmissionType,
      //   );
      //   await this.packageModel.insertMany(packages);
      // }

      // let address = null;
      // if (payload.address && user._id && role === UserRole.INSTRUCTOR) {
      //   address = await this.userAddressDbService.createAddress(
      //     payload.address,
      //     user._id,
      //   );
      //   await this.userDbService.addAddressToUser(user._id, address._id);
      // }

      return successResponse(await this._buildUserRespons(user));
    } catch (error: any) {
          if (error?.code === 11000) {
            if (error?.keyPattern?.email) {
              throw new ConflictException('Email already registered');
            }
            if (error?.keyPattern?.mobileNumber) {
              throw new ConflictException('Mobile number already registered');
            }
            throw new ConflictException('User already exists');
          }
        
          throw new InternalServerErrorException(error?.message);
        }
  }

  public async getProfile(
    publicId: string,
  ): Promise<ApiResponse<UserResponse>> {
    const user = await this.userDbService.findByPublicId(publicId);
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

  public async getMoreProfileDetails(
    userId: string,
  ): Promise<ApiResponse<UserResponse>> {
    const user = await this.userDbService.findByPublicId(userId);
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

  public async findOneAndUpdateByAdditionalInfo(
    email: string,
    updateData: UpdateAdditionalInfoDto | Partial<UserDocument>,
  ): Promise<UserDocument | null> {
    return this.userDbService.findOneAndUpdate(email, updateData);
  }

  public async findOneAndUpdateByVehicleDetails(
    userId: string,
    updateData: UpdateVehicleDetailsDto | Partial<InstructorProfileDocument>,
  ): Promise<InstructorProfileDocument | null> {
    return this.instructorProfileModel.findOneAndUpdate({userId}, updateData);
  }


  private async _buildUserRespons(
    user: UserDocument,
    params: Record<string, unknown> = {},
  ): Promise<UserResponse> {
    // let address: Array<AddressDocument> = [];
    // let packages: Array<PackageDocument> = [];

    // if (isDefined(params['address']) && params['address'] === true) {
    //   address = await this.userAddressDbService.findAllByUserId(user._id);
    // }

    // if (isDefined(params['packages']) && params['packages'] === true) {
    //   packages = await this.packageModel
    //     .find({
    //       userId: user._id,
    //     })
    //     .exec();
    // }

    return {
      id: user.publicId,
      email: user.email,
      publicId: user.publicId,
      role: user.role,
      description: user.description,
      mobileNumber: user.mobileNumber,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`,
      initials: this.getInitials(user.firstName, user.lastName),
      address: [],
    };
  }

  private getInitials(firstname: string, lastname?: string): string {
    const first = firstname?.[0] ?? '';
    const last = lastname?.[0] ?? '';
    return `${first}${last}`.toUpperCase();
  }

  // private gettingUserValue(
  //   payload: RegisterUserDto,
  //   profileImage: string | null,
  // ): Partial<UserDocument> {
  //   const vehicleDetail: VehicleInterface[] = [];
  //   const defaultVehicleValue = {
  //     registrationNumber: '',
  //     licenceCategory: '',
  //     make: '',
  //     model: '',
  //     color: '',
  //     year: 1990,
  //     ancapSafetyRating: '',
  //     hasDualControls: false,
  //   };
  //   const baseVehicle = {
  //     year: 1990,
  //     hasDualControls: false,
  //   };
  //   const transmissionType = payload.transmissionType;
  //   if (transmissionType === TransmissionType.AUTO) {
  //     vehicleDetail.push({
  //       ...baseVehicle,
  //       ...{ transmissionType: TransmissionType.AUTO },
  //     });
  //   } else if (transmissionType === TransmissionType.MANUAL) {
  //     vehicleDetail.push({
  //       ...baseVehicle,
  //       ...{ transmissionType: TransmissionType.AUTO },
  //     });
  //   } else {
  //     vehicleDetail.push(
  //       {
  //         ...baseVehicle,
  //         ...{ transmissionType: TransmissionType.AUTO },
  //       },
  //       {
  //         ...baseVehicle,
  //         ...{ transmissionType: TransmissionType.MANUAL },
  //       },
  //     );
  //   }

  //   const user = {
  //     firstName: payload.firstName,
  //     lastName: payload.lastName,
  //     email: payload.email,
  //     gender: payload.gender,
  //     mobileNumber: payload.mobileNumber,
  //     dob: payload.dob,
  //     description: payload.description,
  //     isTncApproved: payload.isTncApproved,
  //     isNotificationSent: payload.isNotificationSent,
  //     profileImage: profileImage,
  //     vehicles: vehicleDetail,
  //     financialDetail: {
  //       bankName: '',
  //       accountHolderName: '',
  //       accountNumber: '',
  //       bsbNumber: '',
  //       abnNumber: '',
  //       businessName: '',
  //     },
  //   };

  //   return user;
  // }
}
