import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
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
import { Logger } from 'nestjs-pino';


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
