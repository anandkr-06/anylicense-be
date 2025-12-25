import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserDbService } from '@common/db/services/user.db.service';

import { UserDocument } from '@common/db/schemas/user.schema';
import { UserResponse } from '@interfaces/user.interface';

import { InstructorSearchDto } from '../dto/search.dto';
import { successResponse } from '@common/helpers/response.helper';
import { ApiResponse } from '@interfaces/api-response.interfaces';
import { PackageDbService } from '@common/db/services/package.db.service';
import { Model } from 'mongoose';

import { Package, PackageDocument } from '@common/db/schemas/package.schema';
import { isDefined } from 'class-validator';
import { InjectModel } from '@nestjs/mongoose';
import { UserRole } from '@constant/users';
import { Slot, SlotDocument } from '@common/db/schemas/slot.schema';
import { format } from 'date-fns';

@Injectable()
export class SearchService {
  constructor(
    private readonly userDbService: UserDbService,
    @InjectModel(Package.name) private packageModel: Model<PackageDocument>,
    @InjectModel(Slot.name) private readonly slotModel: Model<SlotDocument>,
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
    let packages: Array<PackageDocument> = [];

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
      packages: packages,
      address: [],
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
