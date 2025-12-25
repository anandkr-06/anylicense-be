import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Slot, SlotDocument } from '@common/db/schemas/slot.schema';
import { UserDbService } from '@common/db/services/user.db.service';
import { successResponse } from '@common/helpers/response.helper';

import { UserRole } from '@constant/users';
import { JwtPayload } from '@interfaces/user.interface';

@Injectable()
export class LeanerSlotService {
  constructor(
    @InjectModel(Slot.name) private readonly slotModel: Model<SlotDocument>,
    private readonly userDbService: UserDbService,
  ) {}

  async getInstructorSlots(
    currentUser: JwtPayload,
    instructorPublicId: string,
  ) {
    const leaner = await this.getUser(currentUser.publicId);

    if (!leaner || leaner.role !== UserRole.LEARNER) {
      throw new UnauthorizedException('Leaner not found');
    }

    const instructor = await this.getUser(instructorPublicId);

    if (!instructor || instructor.role !== UserRole.INSTRUCTOR) {
      throw new UnauthorizedException('INSTRUCTOR not found');
    }
    const instructorId = instructor._id;

    const slots = await this.slotModel
      .find({ instructorId })
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

  private async getUser(userPublicId: string) {
    const user = await this.userDbService.findByPublicId(userPublicId);

    return user;
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
}
