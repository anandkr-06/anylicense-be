import { BadRequestException, HttpException, Injectable } from '@nestjs/common';
import { UserDbService } from '@common/db/services/user.db.service';

import { UserResponseBuilder } from '@common/builders/user.builder';
import { User, UserDocument } from '@common/db/schemas/user.schema';
import { JwtPayload, UserResponse } from '@interfaces/user.interface';

import { InstructorSearchDto } from '../dto/search.dto';
import { successResponse } from '@common/helpers/response.helper';
import { ApiResponse } from '@interfaces/api-response.interfaces';
import { PackageDbService } from '@common/db/services/package.db.service';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import {
  ChangePasswordDto,
  UpdateInstructorFinancialDto,
  UpdateInstructorProfileDto,
  UpdateInstructorVehicleDto,
} from '../dto/update-instructor-profile.dto';
import { UserRole } from '@constant/users';
import { CryptoHelper } from '@common/helpers/crypto.helper';
import { comparePassword, hashPassword } from '@common/helpers/bcrypt.helper';

@Injectable()
export class InstructorService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly cryptoHelper: CryptoHelper,
    private readonly userDbService: UserDbService,
    private readonly packageDbService: PackageDbService,
  ) {}

  /**
   * Search basic of date - inslot
   * Package type,
   * and location..
   */
  public async getAll(
    payload: InstructorSearchDto,
  ): Promise<ApiResponse<{ instructors: UserResponse[] }>> {
    const allInstructor = await this.userDbService.findAllInstructor(payload);
    if (!allInstructor || allInstructor.length == 0) {
      return successResponse({ instructors: [] });
    }
    const buildData = allInstructor.map((instructor) => {
      return this._buildUserRespons(instructor);
    });
    return successResponse({ instructors: buildData });
  }

  public async get(
    instructorPublicId: string,
  ): Promise<ApiResponse<{ instructor: UserResponse }>> {
    const instructor =
      await this.userDbService.findByPublicId(instructorPublicId);

    if (!instructor) {
      throw new BadRequestException('No Instructor found');
    }

    const allPackages = await this.packageDbService.findAll(
      new Types.ObjectId(instructor._id),
    );

    const response = this._buildUserRespons(instructor);

    const user = {
      ...response,
      package: allPackages,
    };

    return successResponse({ instructor: user });
  }

  public async getProfile(currentUser: JwtPayload) {
    const instructor = await this.userModel
      .findOne({
        publicId: currentUser.publicId,
      })
      .lean()
      .exec();

    if (!instructor) {
      throw new BadRequestException('No Instructor found');
    }

    const allPackages = await this.packageDbService.findAll(
      new Types.ObjectId(instructor._id),
    );

    const user = {
      ...instructor,
      package: allPackages,
    };

    return successResponse({ instructor: user });
  }

  public async updateProfile(
    currentUser: JwtPayload,
    dto: UpdateInstructorProfileDto,
  ) {
    const user = await this.userModel
      .findOne({
        publicId: currentUser.publicId,
        role: UserRole.INSTRUCTOR,
      })
      .exec();

    if (!user) {
      throw new BadRequestException('No Instructor found');
    }
    try {
      if (dto.firstName !== undefined) user.firstName = dto.firstName;
      if (dto.lastName !== undefined) user.lastName = dto.lastName;
      if (dto.gender !== undefined) user.gender = dto.gender;
      if (dto.dob !== undefined) user.dob = dto.dob;

      // field specifically to instructor

      if (dto.languagesKnown !== undefined) {
        user.languagesKnown = dto.languagesKnown;
      }

      if (dto.proficientLanguages !== undefined) {
        user.proficientLanguages = dto.proficientLanguages;
      }

      if (dto.instructorExperienceYears !== undefined) {
        user.instructorExperienceYears = dto.instructorExperienceYears;
      }

      if (dto.isMemberOfDrivingAssociation !== undefined) {
        user.isMemberOfDrivingAssociation = dto.isMemberOfDrivingAssociation;
      }

      // if (
      //   dto.drivingAssociations !== undefined &&
      //   user.isMemberOfDrivingAssociation
      // ) {
      //   user.drivingAssociations = dto.drivingAssociations;
      // }

      await user.save();
      return successResponse({ instructor: user });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new BadRequestException((error as Error).message);
    }
  }

  public async changePassword(currentUser: JwtPayload, dto: ChangePasswordDto) {
    const user = await this.userModel
      .findOne({
        publicId: currentUser.publicId,
        role: UserRole.INSTRUCTOR,
      })
      .exec();

    if (!user) {
      throw new BadRequestException('No Instructor found');
    }
    const isPasswordValid = await comparePassword(
      dto.oldPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Old password is incorrect');
    }

    const isSamePassword = await comparePassword(
      dto.newPassword,
      user.password,
    );

    if (isSamePassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    try {
      const hashedPassword = await hashPassword(dto.newPassword);
      user.password = hashedPassword;
      await user.save();
      return successResponse({ instructor: user });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new BadRequestException((error as Error).message);
    }
  }

  // public async updateFinancial(
  //   currentUser: JwtPayload,
  //   dto: UpdateInstructorFinancialDto,
  // ) {
  //   const user = await this.userModel
  //     .findOne({
  //       publicId: currentUser.publicId,
  //       role: UserRole.INSTRUCTOR,
  //     })
  //     .exec();

  //   if (!user) {
  //     throw new BadRequestException('No Instructor found');
  //   }
  //   try {
  //     if (!user.financialDetail) {
  //       user.financialDetail = {};
  //     }

  //     if (dto.bankName !== undefined)
  //       user.financialDetail.bankName = dto.bankName;

  //     if (dto.accountHolderName !== undefined)
  //       user.financialDetail.accountHolderName = dto.accountHolderName;

  //     let accountNo = '';
  //     if (dto.accountNumber !== undefined) {
  //       user.financialDetail.accountNumber = this.cryptoHelper.encrypt(
  //         dto.accountNumber,
  //       );
  //       accountNo = this.cryptoHelper.decrypt(
  //         user.financialDetail.accountNumber,
  //       );
  //     }

  //     if (dto.bsbNumber !== undefined)
  //       user.financialDetail.bsbNumber = dto.bsbNumber;

  //     if (dto.abnNumber !== undefined)
  //       user.financialDetail.abnNumber = dto.abnNumber;

  //     if (dto.businessName !== undefined)
  //       user.financialDetail.businessName = dto.businessName;

  //     await user.save();

  //     return successResponse({
  //       financialDetail: {
  //         bankName: user.financialDetail.bankName,
  //         accountHolderName: user.financialDetail.accountHolderName,
  //         accountNumber: accountNo,
  //         bsbNumber: user.financialDetail.bsbNumber,
  //         abnNumber: user.financialDetail.abnNumber,
  //         businessName: user.financialDetail.businessName,
  //       },
  //     });
  //   } catch (error) {
  //     if (error instanceof HttpException) throw error;
  //     throw new BadRequestException((error as Error).message);
  //   }
  // }

  // public async updateVehicle(
  //   currentUser: JwtPayload,
  //   dto: UpdateInstructorVehicleDto,
  // ) {
  //   const user = await this.userModel
  //     .findOne({
  //       publicId: currentUser.publicId,
  //       role: UserRole.INSTRUCTOR,
  //     })
  //     .exec();

  //   if (!user) {
  //     throw new BadRequestException('No Instructor found');
  //   }

  //   if (dto.vehicles.length > 2) {
  //     throw new BadRequestException(
  //       'Only AUTO and MANUAL vehicles are allowed',
  //     );
  //   }

  //   try {
  //     // --- Replace vehicles atomically
  //     user.vehicles = dto.vehicles.map((v) => ({
  //       registrationNumber: v.registrationNumber,
  //       licenceCategory: v.licenceCategory,
  //       make: v.make,
  //       model: v.model,
  //       color: v.color,
  //       year: v.year,
  //       transmissionType: v.transmissionType,
  //       ancapSafetyRating: v.ancapSafetyRating,
  //       hasDualControls: v.hasDualControls ?? false,
  //     }));

  //     await user.save();
  //     return successResponse({
  //       vehicles: user.vehicles.map((v) => ({
  //         registrationNumber: v.registrationNumber,
  //         licenceCategory: v.licenceCategory,
  //         make: v.make,
  //         model: v.model,
  //         color: v.color,
  //         year: v.year,
  //         transmissionType: v.transmissionType,
  //         ancapSafetyRating: v.ancapSafetyRating,
  //         hasDualControls: v.hasDualControls,
  //       })),
  //     });
  //   } catch (error) {
  //     if (error instanceof HttpException) throw error;
  //     throw new BadRequestException((error as Error).message);
  //   }
  // }

  private _buildUserRespons(user: UserDocument): UserResponse {
    return new UserResponseBuilder(user).build();
  }
}
