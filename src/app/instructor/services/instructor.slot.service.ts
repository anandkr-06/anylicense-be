/* eslint-disable max-lines-per-function */
import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  HttpException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Slot, SlotDocument, SlotStatus } from '@common/db/schemas/slot.schema';
import { UserDbService } from '@common/db/services/user.db.service';
import { successResponse } from '@common/helpers/response.helper';
import { CreateMultipleSlotDto, CreateSlotDto } from '../dto/create-slot.dto';
import {
  DeleteSlotStatusDto,
  UpdateSlotDto,
  UpdateSlotStatusDto,
} from '../dto/update-slot.dto';
import { UserRole } from '@constant/users';
import { JwtPayload } from '@interfaces/user.interface';
import { parse, isValid } from 'date-fns';

@Injectable()
export class InstructorSlotService {
  private MIN_GAP_MINUTES = 30;

  constructor(
    @InjectModel(Slot.name) private readonly slotModel: Model<SlotDocument>,
    private readonly userDbService: UserDbService,
  ) {}

  async createSlot(instructorPublicId: string, dto: CreateSlotDto) {
    const instructor = await this.getUser(instructorPublicId);
    if (!instructor || instructor.role !== UserRole.INSTRUCTOR) {
      throw new UnauthorizedException('Instructor not found');
    }

    if (this.checkForToday(dto.date)) {
      throw new BadRequestException('Slot date must be greater than today');
    }
    const instructorId = instructor._id;
    await this.isSlotExist(instructorId, dto.date, dto.startTime, dto.endTime);

    const start = new Date(`${dto.date}T${dto.startTime}:00`);
    const end = new Date(`${dto.date}T${dto.endTime}:00`);

    if (end <= start) {
      throw new BadRequestException('endTime must be greater than startTime');
    }
    /**
     * Checking for a gap, if slot is exist or not.
     */

    const slot = await this.slotModel.create({
      instructorId,
      ...dto,
      status: SlotStatus.AVAILABLE,
      lockedAt: null,
    });

    return successResponse({ slot: this._buildSlot(slot) });
  }

  async createMultipleSlot(
    instructorPublicId: string,
    dto: CreateMultipleSlotDto,
  ) {
    const instructor = await this.getUser(instructorPublicId);
    if (!instructor || instructor.role !== UserRole.INSTRUCTOR) {
      throw new UnauthorizedException('Instructor not found');
    }

    const instructorId = instructor._id;
    const today = new Date().toISOString().substring(0, 10);

    const dates = dto.days.map((d) => d.date);

    if (dates.some((d) => d <= today)) {
      throw new BadRequestException('Slot dates must be greater than today');
    }

    const conflict = await this.slotModel.findOne({
      instructorId,
      date: { $in: dates },
    });
    console.log(dates);
    if (conflict) {
      throw new BadRequestException(
        'One or more selected dates already have slots',
      );
    }

    const slotDocs: any[] = [];

    for (const day of dto.days) {
      if (!day.slots.length) {
        throw new BadRequestException(`No slots provided for ${day.date}`);
      }

      const ranges = day.slots
        .map((s) => {
          const start = this.toMinutes(s.startTime);
          const end = this.toMinutes(s.endTime);

          if (end <= start) {
            throw new BadRequestException(
              `Invalid slot time on ${day.date}: ${s.startTime} - ${s.endTime}`,
            );
          }

          return { start, end };
        })
        .sort((a, b) => a.start - b.start);

      for (let i = 1; i < ranges.length; i++) {
        const current = ranges[i];
        const previous = ranges[i - 1];
        if (!current || !previous) {
          continue; // logically impossible, but satisfies TS
        }
        if (current.start < previous.end) {
          throw new BadRequestException(`Overlapping slots on ${day.date}`);
        }
      }

      for (const slot of day.slots) {
        slotDocs.push({
          instructorId,
          date: day.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          status: SlotStatus.AVAILABLE,
          lockedAt: null,
        });
      }
    }

    try {
      const createdSlots = await this.slotModel.insertMany(slotDocs);

      return successResponse({
        message: 'Slots created successfully',
        total: createdSlots.length,
        dates,
      });
    } catch (err: any) {
      if (err.code === 11000) {
        throw new BadRequestException(
          'One or more selected dates already have slots',
        );
      }
      throw err;
    }
  }

  private toMinutes(time: string): number {
    const parts = time.split(':');

    if (parts.length !== 2) {
      throw new BadRequestException('Invalid time format');
    }

    const h = Number(parts[0]);
    const m = Number(parts[1]);

    if (Number.isNaN(h) || Number.isNaN(m)) {
      throw new BadRequestException('Invalid time format');
    }

    return h * 60 + m;
  }

  async updateSlotStatus(currentUser: JwtPayload, dto: UpdateSlotStatusDto) {
    const instructor = await this.getUser(currentUser.publicId);
    if (!instructor || instructor.role !== UserRole.INSTRUCTOR) {
      throw new UnauthorizedException('User not found');
    }
    const instructorId = instructor._id;

    if (!dto.slotId) {
      throw new BadRequestException('Missing Slot id.');
    }

    const slot = await this.slotModel.findOne({
      publicId: dto.slotId,
      instructorId: instructorId,
    });

    if (!slot) {
      throw new BadRequestException('Slot not found');
    }

    if (slot.status === SlotStatus.BOOKED || slot.lockedAt) {
      throw new BadRequestException('Slot is locked or booked');
    }

    if (!this.isValidStatusTransition(slot.status, dto.status)) {
      throw new BadRequestException(
        `Invalid status transition: ${slot.status} → ${dto.status}`,
      );
    }

    const slotStart = this.toDate(slot.date, slot.startTime);
    const now = new Date();

    if (slotStart <= now) {
      throw new BadRequestException('Past date Status cannot be updated');
    }
    try {
      slot.status = dto.status;
      const updateSlot = await slot.save();
      console.log(updateSlot);
      return { slot: this._buildSlot(updateSlot) };
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      throw new BadRequestException((error as Error).message);
    }
  }

  async deleteSlot(currentUser: JwtPayload, dto: DeleteSlotStatusDto) {
    const instructor = await this.getUser(currentUser.publicId);
    if (!instructor || instructor.role !== UserRole.INSTRUCTOR) {
      throw new UnauthorizedException('User not found');
    }
    const instructorId = instructor._id;

    if (!dto.slotId) {
      throw new BadRequestException('Missing Slot id.');
    }

    const slot = await this.slotModel.findOne({
      publicId: dto.slotId,
      instructorId: instructorId,
    });

    if (!slot) {
      throw new BadRequestException('Slot not found');
    }

    if (slot.lockedAt) {
      throw new BadRequestException('Slot is locked or booked');
    }

    if (slot.status !== SlotStatus.AVAILABLE) {
      throw new BadRequestException('Only delete avilable slot');
    }
    const slotStart = this.toDate(slot.date, slot.startTime);
    if (slotStart <= new Date()) {
      throw new BadRequestException('Cannot delete past or started slot');
    }

    try {
      await this.slotModel.deleteOne({ _id: slot._id });
      return { success: true };
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      throw new BadRequestException((error as Error).message);
    }
  }

  async updateSlot(currentUser: JwtPayload, dto: UpdateSlotDto) {
    const instructor = await this.getUser(currentUser.publicId);
    if (!instructor || instructor.role !== UserRole.INSTRUCTOR) {
      throw new UnauthorizedException('User not found');
    }
    const instructorId = instructor._id;

    if (!dto.slotId) {
      throw new BadRequestException('Missing Slot id.');
    }

    const slot = await this.slotModel.findOne({
      publicId: dto.slotId,
      instructorId: instructorId,
    });

    if (!slot) {
      throw new BadRequestException('Slot not found');
    }

    if (slot.status === SlotStatus.BOOKED || slot.lockedAt) {
      throw new BadRequestException('Slot is locked or booked');
    }

    const newStartTime = dto.startTime;
    const newEndTime = dto.endTime;

    if (this.isSlotInPast(dto.date, newStartTime)) {
      throw new BadRequestException('Cannot update past slot');
    }

    try {
      await this.validateSlotTiming(
        slot.instructorId,
        dto.date,
        newStartTime,
        newEndTime,
        slot.publicId,
      );

      slot.startTime = newStartTime;
      slot.endTime = newEndTime;

      await slot.save();

      return { slot: this._buildSlot(slot) };
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      throw new BadRequestException((error as Error).message);
    }
  }

  async lockSlot(publicId: string) {
    const slot = await this.slotModel.findOne({ publicId });

    if (!slot) throw new BadRequestException('Slot not found');

    if (slot.status !== SlotStatus.AVAILABLE)
      throw new BadRequestException('Slot is not available');

    slot.status = SlotStatus.BOOKED;
    slot.lockedAt = new Date();

    return slot.save();
  }

  async getSlots(instructorPublicId: string) {
    const instructor = await this.getUser(instructorPublicId);

    if (!instructor || instructor.role !== UserRole.INSTRUCTOR) {
      throw new UnauthorizedException('User not found');
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

  private isValidStatusTransition(from: SlotStatus, to: SlotStatus): boolean {
    const transitions: Record<SlotStatus, SlotStatus[]> = {
      [SlotStatus.AVAILABLE]: [SlotStatus.CANCELED],
      [SlotStatus.BOOKED]: [SlotStatus.COMPLETED],
      [SlotStatus.CANCELED]: [],
      [SlotStatus.COMPLETED]: [],
    };

    return transitions[from].includes(to);
  }

  private async getUser(userPublicId: string) {
    const user = await this.userDbService.findByPublicId(userPublicId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  private isSlotInPast(date: string, startTime: string): boolean {
    const slotStart = this.toDate(date, startTime);
    return slotStart <= new Date();
  }
  private toDate(date: string, time: string): Date {
    const parsed = parse(`${date} ${time}`, 'yyyy-MM-dd HH:mm', new Date());

    if (!isValid(parsed)) {
      throw new BadRequestException('Invalid date or time format');
    }

    return parsed;
  }

  private async isSlotExist(
    instructorId: Types.ObjectId,
    date: string,
    startTime: string,
    endTime: string,
  ) {
    const start = this.toDate(date, startTime);
    const end = this.toDate(date, endTime);

    const minGapMs = this.MIN_GAP_MINUTES * 60 * 1000;

    const slots = await this.slotModel.find({
      instructorId,
      date,
    });

    for (const slot of slots) {
      const s = this.toDate(slot.date, slot.startTime);
      const e = this.toDate(slot.date, slot.endTime);

      // Already exists or not..
      const overlaps = start < e && end > s;

      if (overlaps) {
        throw new BadRequestException(
          'New slot overlaps with an existing slot',
        );
      }

      // 30 minutes gap (BEFORE + AFTER)
      const tooCloseBefore = Math.abs(start.getTime() - e.getTime()) < minGapMs;
      const tooCloseAfter = Math.abs(s.getTime() - end.getTime()) < minGapMs;

      if (tooCloseBefore || tooCloseAfter) {
        throw new BadRequestException(
          `Slots must have at least ${this.MIN_GAP_MINUTES} minutes gap.`,
        );
      }
    }
  }

  private checkForToday(date: string) {
    const slotDate = new Date(date + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return slotDate <= today;
  }

  private async validateSlotTiming(
    instructorId: Types.ObjectId,
    date: string,
    startTime: string,
    endTime: string,
    excludeSlotId?: string,
  ) {
    const start = this.toDate(date, startTime);
    const end = this.toDate(date, endTime);

    if (start >= end) {
      throw new BadRequestException('Start time must be before end time');
    }

    const minGapMs = this.MIN_GAP_MINUTES * 60 * 1000;

    const query: any = {
      instructorId,
      date,
      status: { $in: [SlotStatus.AVAILABLE, SlotStatus.BOOKED] },
    };

    if (excludeSlotId) {
      query.publicId = { $ne: excludeSlotId };
    }

    const slots = await this.slotModel.find(query);

    for (const slot of slots) {
      const s = this.toDate(slot.date, slot.startTime);
      const e = this.toDate(slot.date, slot.endTime);

      if (start < e && end > s) {
        throw new BadRequestException('Slot overlaps with an existing slot');
      }

      if (start >= e && start.getTime() - e.getTime() < minGapMs) {
        throw new BadRequestException(
          `Slots must have at least ${this.MIN_GAP_MINUTES} minutes gap.`,
        );
      }

      if (end <= s && s.getTime() - end.getTime() < minGapMs) {
        throw new BadRequestException(
          `Slots must have at least ${this.MIN_GAP_MINUTES} minutes gap.`,
        );
      }
    }
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
