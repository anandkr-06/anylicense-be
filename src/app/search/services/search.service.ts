import {
  BadRequestException,
  Injectable,
  UnauthorizedException, NotFoundException
} from '@nestjs/common';
import { Types } from 'mongoose';
import { UserDbService } from '@common/db/services/user.db.service';

import { UserDocument } from '@common/db/schemas/user.schema';


import { UserResponse } from '@interfaces/user.interface';

import { InstructorSearchDto } from '../dto/search.dto';
import { successResponse } from '@common/helpers/response.helper';
import { ApiResponse } from '@interfaces/api-response.interfaces';
import { PackageDbService } from '@common/db/services/package.db.service';
import { Model } from 'mongoose';

import { Package, PackageDocument } from '@common/db/schemas/package.schema';
import { InstructorProfile,InstructorProfileDocument } from '@common/db/schemas/instructor-profile.schema';
import { InstructorProfileResponse } from '@interfaces/instructor-profile.interface';
import { InstructorProfileResponseBuilder } from '@interfaces/instructor-profile-response.builder';
import { isDefined } from 'class-validator';
import { InjectModel } from '@nestjs/mongoose';
import { UserRole } from '@constant/users';
import { Slot, SlotDocument } from '@common/db/schemas/slot.schema';
import { format } from 'date-fns';

import {SearchInstructorDto} from '../dto/search-instructor.dto'
import { isSlotInTimeOfDay } from '../../utils/time-of-day.util.ts';
import { any } from 'joi';

@Injectable()
export class SearchService {
  constructor(
    private readonly userDbService: UserDbService,
  
    @InjectModel(Package.name)
    private readonly packageModel: Model<PackageDocument>,
  
    @InjectModel(InstructorProfile.name) 
    private readonly instructorProfileModel: Model<InstructorProfileDocument>,
  
    @InjectModel(Slot.name)
    private readonly slotModel: Model<SlotDocument>,
  ) {}

//Insturctor profile after search
async getInstructorProfile(instructorId: string) {
  const result = await this.instructorProfileModel.aggregate([
    {
      $match: {
        userId: new Types.ObjectId(instructorId)
      }
    },

    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },

    {
      $addFields: {
        vehicles: {
          $filter: {
            input: [
              
              {
                vehicleType: 'auto',
                hasVehicle: { $ifNull: ['$vehicles.auto.hasVehicle', false] },
              
                make: '$vehicles.auto.details.make',
                model: '$vehicles.auto.details.model',
                color: '$vehicles.manual.details.color',
                year: '$vehicles.manual.details.year',
                ancapSafetyRating: '$vehicles.manual.details.ancapSafetyRating',
                hasDualControls: '$vehicles.manual.details.hasDualControls',
              
                prices: {
                  perHourPrice: '$vehicles.auto.pricePerHour',
                  testPerHourPrice: '$vehicles.auto.testPricePerHour',
                  privatePerHourPrice: '$vehicles.private.auto.pricePerHour',
                  testPrivatePerHourPrice:
                    '$vehicles.private.auto.testPricePerHour'
                }
              },
              {
                vehicleType: 'manual',
                hasVehicle: { $ifNull: ['$vehicles.manual.hasVehicle', false] },
              
                make: '$vehicles.manual.details.make',
                model: '$vehicles.manual.details.model',
                color: '$vehicles.manual.details.color',
                year: '$vehicles.manual.details.year',
                ancapSafetyRating: '$vehicles.manual.details.ancapSafetyRating',
                hasDualControls: '$vehicles.manual.details.hasDualControls',
              
                prices: {
                  perHourPrice: '$vehicles.manual.pricePerHour',
                  testPerHourPrice: '$vehicles.manual.testPricePerHour',
                  privatePerHourPrice: '$vehicles.private.manual.pricePerHour',
                  testPrivatePerHourPrice:
                    '$vehicles.private.manual.testPricePerHour'
                }
              },
            ],
            as: 'v',
            cond: { $ne: ['$$v', null] }
          }
        }
      }
    },
    
    
    

    {
      $project: {
        _id: 0,
        instructorId: '$userId',
        fullName: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
        firstName: '$user.firstName',
        lastName: '$user.lastName',
        profileImage: '$user.profileImage',
        rating: { $ifNull: ['$rating', 0] },
        totalLessons: { $ifNull: ['$totalLessons', 0] },
        description: '$user.description',
        languagesKnown: '$user.languagesKnown',
        proficientLanguages: '$user.proficientLanguages',
        vehicles: 1,
        serviceAreas: 1,
        testLocations:1,
        totalHours:1
      }
    }
  ]);

  if (!result.length) {
    throw new NotFoundException('Instructor not found');
  }

  return result[0];
}


  //Search
  async searchInstructors(query: SearchInstructorDto) {
    const {
      postcode,
      suburbId,
      vehicleType,
      date,
      timeOfDay, // "AM" | "PM"
      page = 1,
      limit = 10,
      sortOrder = 'asc',
    } = query;
  
    const skip = (page - 1) * limit;
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
  
    const pipeline: any[] = [
      /** 1️⃣ Match suburb + vehicle */
      {
        $match: {
          serviceAreas: {
            $elemMatch: { suburbId: new RegExp(suburbId, 'i') },
           // $elemMatch: { postcode: new RegExp(postcode, 'i') },
          },
          [`vehicles.${vehicleType}.hasVehicle`]: true,
        },
      },
  
      /** 2️⃣ Match availability date (optional) */
      ...(date
        ? [
            {
              $match: {
                'availability.weeks.startDate': { $lte: date },
                'availability.weeks.endDate': { $gte: date },
              },
            },
          ]
        : []),
  
      /** 3️⃣ Unwind weeks → days → slots */
      { $unwind: '$availability.weeks' },
      { $unwind: '$availability.weeks.days' },
      { $unwind: '$availability.weeks.days.slots' },
  
      /** 4️⃣ Filter by exact date (optional) */
      ...(date
        ? [
            {
              $match: {
                'availability.weeks.days.date': date,
              },
            },
          ]
        : []),
  
      /** 5️⃣ AM / PM FILTER ✅ */
      ...(timeOfDay
        ? [
            {
              $match: {
                $expr:
                  timeOfDay === 'AM'
                    ? {
                        $lt: [
                          {
                            $toInt: {
                              $substr: [
                                '$availability.weeks.days.slots.startTime',
                                0,
                                2,
                              ],
                            },
                          },
                          12,
                        ],
                      }
                    : {
                        $gte: [
                          {
                            $toInt: {
                              $substr: [
                                '$availability.weeks.days.slots.startTime',
                                0,
                                2,
                              ],
                            },
                          },
                          12,
                        ],
                      },
              },
            },
          ]
        : []),
  
      /** 6️⃣ Join users */
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
  
      /** 7️⃣ Group back → ONE instructor */
      {
        $group: {
          _id: '$_id',
          instructorId: { $first: '$userId' },
          firstName: { $first: '$user.firstName' },
          lastName: { $first: '$user.lastName' },
          profileImage: { $first: '$user.profileImage' },
          rating: { $first: { $ifNull: ['$rating', 0] } },
          noOfLessons: { $first: { $ifNull: ['$totalLessons', 0] } },
          totalHours: { $first: { $ifNull: ['$totalHours', 0] } },
          vehicleType: { $first: vehicleType },
          model: {
            $first: `$vehicles.${vehicleType}.details.model`,
          },
          make: {
            $first: `$vehicles.${vehicleType}.details.make`,
          },
          pricePerHour: {
            $first: `$vehicles.${vehicleType}.pricePerHour`,
          },
        },
      },
  
      /** 8️⃣ Sort by price */
      { $sort: { pricePerHour: sortDirection } },
  
      /** 9️⃣ Pagination */
      { $skip: skip },
      { $limit: Number(limit) },
    ];
  
    const data = await this.instructorProfileModel.aggregate(pipeline);
  
    return {
      page: Number(page),
      limit: Number(limit),
      total: data.length,
      data,
    };
  }
  
  async searchTestInstructors(query: SearchInstructorDto) {
    const {
      postcode,
      vehicleType,
      date,
      timeOfDay, // "AM" | "PM"
      page = 1,
      limit = 10,
      sortOrder = 'asc',
    } = query;
  
    const skip = (page - 1) * limit;
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
  
    const pipeline: any[] = [
      /** 1️⃣ Match suburb + vehicle */
      {
        $match: {
          testLocations: {
            // $elemMatch: { suburb: new RegExp(suburb, 'i') },
            $elemMatch: { postCode: new RegExp(postcode, 'i') },
          },
          [`vehicles.${vehicleType}.hasVehicle`]: true,
        },
      },
  
      /** 2️⃣ Match availability date (optional) */
      ...(date
        ? [
            {
              $match: {
                'availability.weeks.startDate': { $lte: date },
                'availability.weeks.endDate': { $gte: date },
              },
            },
          ]
        : []),
  
      /** 3️⃣ Unwind weeks → days → slots */
      { $unwind: '$availability.weeks' },
      { $unwind: '$availability.weeks.days' },
      { $unwind: '$availability.weeks.days.slots' },
  
      /** 4️⃣ Filter by exact date (optional) */
      ...(date
        ? [
            {
              $match: {
                'availability.weeks.days.date': date,
              },
            },
          ]
        : []),
  
      /** 5️⃣ AM / PM FILTER ✅ */
      ...(timeOfDay
        ? [
            {
              $match: {
                $expr:
                  timeOfDay === 'AM'
                    ? {
                        $lt: [
                          {
                            $toInt: {
                              $substr: [
                                '$availability.weeks.days.slots.startTime',
                                0,
                                2,
                              ],
                            },
                          },
                          12,
                        ],
                      }
                    : {
                        $gte: [
                          {
                            $toInt: {
                              $substr: [
                                '$availability.weeks.days.slots.startTime',
                                0,
                                2,
                              ],
                            },
                          },
                          12,
                        ],
                      },
              },
            },
          ]
        : []),
  
      /** 6️⃣ Join users */
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
  
      /** 7️⃣ Group back → ONE instructor */
      {
        $group: {
          _id: '$_id',
          instructorId: { $first: '$userId' },
          firstName: { $first: '$user.firstName' },
          lastName: { $first: '$user.lastName' },
          profileImage: { $first: '$user.profileImage' },
          rating: { $first: { $ifNull: ['$rating', 0] } },
          noOfLessons: { $first: { $ifNull: ['$totalLessons', 0] } },
          totalHours: { $first: { $ifNull: ['$totalHours', 0] } },
          vehicleType: { $first: vehicleType ? 'auto' : 'manual' },
          model: {
            $first: `$vehicles.${vehicleType? 'auto':'manual'}.details.model`,
          },
          make: {
            $first: `$vehicles.${vehicleType? 'auto':'manual'}.details.make`,
          },
          pricePerHour: {
            $first: `$vehicles.${vehicleType? 'auto':'manual'}.pricePerHour`,
          },
        },
      },
  
      /** 8️⃣ Sort by price */
      { $sort: { pricePerHour: sortDirection } },
  
      /** 9️⃣ Pagination */
      { $skip: skip },
      { $limit: Number(limit) },
    ];
  
    const data = await this.instructorProfileModel.aggregate(pipeline);
  
    return {
      page: Number(page),
      limit: Number(limit),
      total: data.length,
      data,
    };
  }
  
  
  
  

  
  public async getAll(
    payload: InstructorSearchDto,
  ): Promise<ApiResponse<{ instructors: UserResponse[] }>> {
    const allInstructor = await this.userDbService.findAllInstructor(payload);
    if (!allInstructor || allInstructor.length == 0) {
      return successResponse({ instructors: [] });
    }

    const instructors: UserResponse[] = await Promise.all(
      allInstructor.map((instructor) => this._buildUserRespons(instructor)),
    );

    return successResponse({
      instructors: instructors,
    });
  }

  public async getInstructor(
    instructorPublicId: string,
  ): Promise<ApiResponse<{ instructor: UserResponse }>> {
    const instructor =
      await this.userDbService.findByInstructorPublicId(instructorPublicId);

    if (!instructor) {
      throw new BadRequestException('No Instructor found');
    }

    const response = await this._buildUserRespons(instructor, {
      packages: true,
    });

    return successResponse({ instructor: response });
  }

  async getInstructorSlots(instructorPublicId: string) {
    const instructor = await this.getUser(instructorPublicId);

    if (!instructor || instructor.role !== UserRole.INSTRUCTOR) {
      throw new UnauthorizedException('INSTRUCTOR not found');
    }
    const instructorId = instructor._id;
    const now = new Date();

    const today = format(now, 'yyyy-MM-dd');

    const slots = await this.slotModel
      .find({
        instructorId,
        $or: [{ date: { $gt: today } }],
      })
      .sort({ date: 1, startTime: 1 })
      .exec();

    if (!slots || slots.length == 0) {
      return successResponse({ instructors: [] });
    }
    const buildData = slots.map((item) => {
      return this._buildSlot(item);
    });

    const availableDates = [...new Set(buildData.map((slot) => slot.date))];

    return successResponse({ availableDates, slots: buildData });
  }

  private async _buildUserRespons(
    user: UserDocument,
    params: Record<string, unknown> = {},
  ): Promise<UserResponse> {
  
    let profile: InstructorProfileResponse[] = [];
  
    // ✅ fetch profile unless explicitly disabled
    if (params['profile'] !== false) {
      const profiles = await this.instructorProfileModel
      .find({ userId: new Types.ObjectId(user._id) })
        .exec();
  
  
      profile = profiles.map(p =>
        InstructorProfileResponseBuilder.from(p),
      );
    }
    const profiles = await this.instructorProfileModel
  .find({ userId: user._id })
  .lean()
  .exec();

profile = profiles.map(p =>
  InstructorProfileResponseBuilder.from(p as any),
);

  
    return {
      id: user.publicId,
      publicId: user.publicId,
      email: user.email,
      role: user.role,
  
      description: user.description ?? '',
      mobileNumber: user.mobileNumber ?? '',
  
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      fullName: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
      initials: this.getInitials(user.firstName, user.lastName),
  
      gender: user.gender ?? undefined,
      dob: user.dob ? new Date(user.dob).toISOString() : null,
  
      profileImage: null,
      postcode: user.postCode ?? null,
  
      languagesKnown: user.languagesKnown ?? [],
      proficientLanguages: user.proficientLanguages ?? [],
  
      instructorExperienceYears: user.instructorExperienceYears ?? 0,
      isMemberOfDrivingAssociation: user.isMemberOfDrivingAssociation ?? false,
      transmissionType: user.transmissionType ?? null,
      state: user.state ?? null,
      profile,
    };
  }
  

  private _buildSlot(slot: SlotDocument) {
    return {
      id: slot.publicId,
      publicId: slot.publicId,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      status: slot.status,
      lockedAt: slot.lockedAt,
    };
  }

  private getInitials(firstname: string, lastname?: string): string {
    const first = firstname?.[0] ?? '';
    const last = lastname?.[0] ?? '';
    return `${first}${last}`.toUpperCase();
  }

  private async getUser(userPublicId: string) {
    const user = await this.userDbService.findByPublicId(userPublicId);

    return user;
  }
}
