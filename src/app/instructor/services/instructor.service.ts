import { BadRequestException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
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
import { UpdateVehicleDto } from '../dto/update-vehicle.dto';
import { UpdatePrivateVehicleDto } from '../dto/update-private-vehicle.dto';
import { InstructorProfileDocument, InstructorProfile } from '@common/db/schemas/instructor-profile.schema';
import {UpdateFinancialDetailsDto} from '../dto/update-financial-details.dto'
import {UpdateDocumentsDto} from '../dto/update-documents.dto'
import {ServiceAreaDto} from '../dto/service-area.dto'
import {UpdateAvailabilityDto} from '../dto/update-availability.dto'
import {AvailabilityWeekDto} from '../dto/week.dto'
import {AvailabilityDayDto as AvailabilityDay} from '../dto/availability-day.dto'

@Injectable()
export class InstructorService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly cryptoHelper: CryptoHelper,
    private readonly userDbService: UserDbService,
    private readonly packageDbService: PackageDbService,
    @InjectModel(InstructorProfile.name) private instructorProfileModel: Model<InstructorProfileDocument>,
  ) {}

  private generateDays(startDate: string, endDate: string): AvailabilityDay[] {
    const days: AvailabilityDay[] = [];
  
    let current = new Date(startDate);
    const end = new Date(endDate);
  
    while (current <= end) {
      const dateStr = current.toISOString().substring(0, 10);
  
      days.push({
        date: dateStr,
        slots: [],
      });
  
      current.setDate(current.getDate() + 1);
    }
  
    return days;
  }
  
  
  async appendWeek(
    userId: string,
    { startDate, endDate }: { startDate: string; endDate: string }
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
  
    if (end < start) {
      throw new BadRequestException('Invalid date range');
    }
  
    const diff =
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) + 1;
  
    if (diff > 7) {
      throw new BadRequestException('Week cannot exceed 7 days');
    }
  
    const weekId = `${startDate}_${endDate}`;
  
    // 🔹 generate days
    const days = [];
    const current = new Date(start);
  
    while (current <= end) {
      days.push({
        date: current.toISOString().split('T')[0],
        slots: [],
      });
      current.setDate(current.getDate() + 1);
    }
  
    const week = {
      weekId,
      startDate,
      endDate,
      days,
    };
  
    // 🔒 atomic append (NO overwrite, NO duplicate)
    const result = await this.instructorProfileModel.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
  
        // prevent duplicate weekId
        'availability.weeks.weekId': { $ne: weekId },
  
        // prevent overlapping ranges
        'availability.weeks': {
          $not: {
            $elemMatch: {
              startDate: { $lte: endDate },
              endDate: { $gte: startDate },
            },
          },
        },
      },
      {
        $addToSet: {
          'availability.weeks': week,
        },
      },
      { new: true }
    );
  
    if (!result) {
      throw new BadRequestException(
        'Week overlaps existing availability or already exists',
      );
    }
  
    return {
      message: 'Week added successfully',
      week,
    };
  }
  
  
  
  
  async addAvailabilityWeek(userId: string, dto: AvailabilityWeekDto) {
    const profile = await this.instructorProfileModel.findOne({
      userId: new Types.ObjectId(userId),
    });
  
    if (!profile) {
      throw new NotFoundException('Instructor profile not found');
    }
  
    const newStart = new Date(dto.startDate);
    const newEnd = new Date(dto.endDate);
  
    const weeks = profile.availability?.weeks || [];
  
    const isOverlapping = weeks.some((week) =>
      newStart <= new Date(week.endDate) &&
      newEnd >= new Date(week.startDate),
    );
  
    if (isOverlapping) {
      throw new BadRequestException('Week overlaps existing availability');
    }
  
    const week: AvailabilityWeekDto = {
      // weekId: `${dto.startDate}_${dto.endDate}`,
      startDate: dto.startDate,
      endDate: dto.endDate,
      days: this.generateDays(dto.startDate, dto.endDate),
    };
  
    await this.instructorProfileModel.updateOne(
      { userId: new Types.ObjectId(userId) },
      { $push: { 'availability.weeks': week } },
    );
  
    return week;
  }
  
  
  


// 2️⃣ UPDATE WHOLE WEEK
async updateWeek(
  userId: string,
  weekId: string,
  body: AvailabilityWeekDto
) {

  if (!/^\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}$/.test(weekId)) {
    throw new BadRequestException('Invalid weekId format');
  }
  
  const profile = await this.instructorProfileModel.findOne({ userId: new Types.ObjectId(userId) });
  if (!profile) throw new NotFoundException('Instructor not found');

  const index = profile.availability.weeks.findIndex(
    w => w.weekId === weekId
  );

  if (index === -1) {
    throw new NotFoundException('Week not found');
  }

  profile.availability.weeks[index] = {
    ...body,
    weekId
  };

  await profile.save();

  return { message: 'Week updated successfully' };
}

async updateDaySlots(
    userId: string,
    weekId: string,
    body: { date: string; slots: any[] }
  ) {
    if (!/^\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}$/.test(weekId)) {
      throw new BadRequestException('Invalid weekId format');
    }
    const profile = await this.instructorProfileModel.findOne({ userId: new Types.ObjectId(userId) });
    if (!profile) throw new NotFoundException('Instructor not found');

    const week = profile.availability.weeks.find(
      w => w.weekId === weekId
    );

    if (!week) {
      throw new NotFoundException('Week not found');
    }

    const day = week.days.find(d => d.date === body.date);

    if (!day) {
      throw new BadRequestException('Date not in selected week');
    }

    day.slots = body.slots;
    await profile.save();

    return { message: 'Day slots updated successfully' };
  }

// 4️⃣ GET AVAILABILITY
async getAvailability(userId: string) {
  const profile = await this.instructorProfileModel.findOne(
    { userId: new Types.ObjectId(userId) },
    { availability: 1 }
  );

  if (!profile) throw new NotFoundException('Instructor not found');

  return profile.availability;
}

async updateServiceAreas(
  userId: string,
  serviceAreas: ServiceAreaDto[]
) {
  try {
    

    const instructor = await this.instructorProfileModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { $set: { serviceAreas } },
      { new: true }
    );

    console.log('UPDATED INSTRUCTOR:', instructor);

    if (!instructor) {
      throw new NotFoundException('Instructor profile not found');
    }

    return {
      message: 'Service areas updated successfully',
    };
  } catch (error) {
    console.error('UPDATE SERVICE AREAS ERROR:', error);
    throw error; // ❗ rethrow so NestJS shows correct status
  }
}

  
  async updateDocuments(
    userId: string,
    dto: UpdateDocumentsDto
  ) {
    const update: any = {};
  
    for (const [key, value] of Object.entries(dto)) {
      for (const [field, fieldValue] of Object.entries(value)) {
        update[`documents.${key}.${field}`] = fieldValue;
      }
    }
  
    const instructor = await this.instructorProfileModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { $set: update },
      { new: true }
    );
  
    if (!instructor) {
      throw new NotFoundException('Instructor profile not found');
    }
  
    return {
      message: 'Documents updated successfully',
    };
  }

  
  async updateFinancialDetails(
    userId: string,
    dto: UpdateFinancialDetailsDto
  ) {
    const instructor = await this.instructorProfileModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      {
        $set: {
          'financialDetails.bankName': dto.bankName,
          'financialDetails.accountHolderName': dto.accountHolderName,
          'financialDetails.accountNumber': dto.accountNumber,
          'financialDetails.bsbNumber': dto.bsbNumber,
          'financialDetails.abnNumber': dto.abnNumber,
          'financialDetails.businessName': dto.businessName,
        },
      },
      { new: true }
    );
  
    if (!instructor) {
      throw new NotFoundException('Instructor profile not found');
    }
  
    return {
      message: 'Financial details updated successfully',
    };
  }
  


async updateVehicle(
  userId: string,
  vehicleType: 'auto' | 'manual',
  dto: UpdateVehicleDto
) {
  const update: any = {
    [`vehicles.${vehicleType}.hasVehicle`]: true
  };

  if (dto.pricePerHour !== undefined) {
    update[`vehicles.${vehicleType}.pricePerHour`] = dto.pricePerHour;
  }

  if (dto.testPricePerHour !== undefined) {
    update[`vehicles.${vehicleType}.testPricePerHour`] = dto.testPricePerHour;
  }

  Object.entries(dto).forEach(([key, value]) => {
    if (
      value !== undefined &&
      !['pricePerHour', 'testPricePerHour'].includes(key)
    ) {
      update[`vehicles.${vehicleType}.details.${key}`] = value;
    }
  });

  const updated = await this.instructorProfileModel.findOneAndUpdate(
    { userId: new Types.ObjectId(userId) },
    { $set: update },
    { new: true }
  );
  
  if (!updated) {
    throw new NotFoundException(`${userId}Instructor profile not found`);
  }
  
  return {
    message: `${vehicleType.toUpperCase()} vehicle updated successfully`,
    vehicles: updated.vehicles
  };

  //return { message: `${vehicleType.toUpperCase()} vehicle updated successfully` };
}

  
async updatePrivateVehicle(
  userId: string,
  dto: UpdatePrivateVehicleDto
) {
  const update: any = {
    'vehicles.private.hasVehicle': true
  };

  if (dto.autoPricePerHour !== undefined) {
    update['vehicles.private.auto.pricePerHour'] = dto.autoPricePerHour;
  }

  if (dto.autoTestPricePerHour !== undefined) {
    update['vehicles.private.auto.testPricePerHour'] = dto.autoTestPricePerHour;
  }

  if (dto.manualPricePerHour !== undefined) {
    update['vehicles.private.manual.pricePerHour'] = dto.manualPricePerHour;
  }

  if (dto.manualTestPricePerHour !== undefined) {
    update['vehicles.private.manual.testPricePerHour'] = dto.manualTestPricePerHour;
  }

  const profile = await this.instructorProfileModel.findOneAndUpdate(
    { userId: new Types.ObjectId(userId) },
    { $set: update },
    { new: true }
  );

  if (!profile) {
    throw new NotFoundException('Instructor profile not found');
  }

  return {
    message: 'Private vehicle pricing updated successfully',
    private: profile.vehicles.private
  };
}

  
  async getVehicleDetails(userId: string) {
    const profile = await this.instructorProfileModel
      .findOne({ userId })
      .select('vehicles');
  
    return profile?.vehicles || {};
  }

  
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
