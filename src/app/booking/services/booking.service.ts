/* eslint-disable max-lines-per-function */
import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException,
  HttpException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtPayload } from '@interfaces/user.interface';
import {
  Booking,
  BookingDocument,
  BookingStatus,
} from '../schemas/booking.schema';
import { Lesson, LessonDocument } from '../schemas/lesson.schema';
import { Slot, SlotDocument, SlotStatus } from '@common/db/schemas/slot.schema';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { UserDbService } from '@common/db/services/user.db.service';
import { PackageDbService } from '@common/db/services/package.db.service';
import { SuburbDbService } from '@common/db/services/suburb.db.service';

@Injectable()
export class BookingService {
  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    @InjectModel(Lesson.name) private lessonModel: Model<LessonDocument>,
    @InjectModel(Slot.name) private slotModel: Model<SlotDocument>,
    private readonly userDbService: UserDbService,
    private readonly packageDbService: PackageDbService,
    private readonly suburbDbService: SuburbDbService,
  ) {}

  public async createBooking(
    currentUser: JwtPayload,
    payload: CreateBookingDto,
  ): Promise<BookingDocument> {
    try {
      if (!payload.instructorId)
        throw new BadRequestException('Instructor required');

      const instructor = await this.userDbService.findByInstructorPublicId(
        payload.instructorId,
      );
      if (!instructor) {
        throw new UnauthorizedException('Instructor not found');
      }

      const leaner = await this.userDbService.findByLeanerPublicId(
        currentUser.publicId,
      );
      if (!leaner) {
        throw new UnauthorizedException('Leaner not found');
      }

      const instructorPackage = await this.packageDbService.findByPublicId(
        payload.packageId,
        instructor._id,
      );
      if (!instructorPackage) {
        throw new UnauthorizedException('Package not found');
      }

      let totalBookedHours = 0;
      const lessonsData = [];

      for (const lesson of payload.lessons) {
        const slot = await this.slotModel.findOne({ publicId: lesson.slotId });
        if (!slot)
          throw new BadRequestException(`Slot ${lesson.slotId} not found`);

        if (slot.status !== SlotStatus.AVAILABLE)
          throw new BadRequestException(`Slot ${lesson.slotId} not available`);

        const suburb = await this.suburbDbService.findByPublicId(
          lesson.suburbId,
        );

        if (!suburb)
          throw new BadRequestException(`Suburb ${lesson.suburbId} not found`);

        // Check endTime > startTime
        const [sh, sm] = this.parseTime(slot.startTime);
        const [eh, em] = this.parseTime(slot.endTime);

        if (eh < sh || (eh === sh && em <= sm)) {
          throw new BadRequestException('End time must be after start time');
        }

        const diffHours = lesson.hours;
        totalBookedHours += diffHours;

        lessonsData.push({
          ...lesson,
          startTime: slot.startTime,
          endTime: slot.endTime,
          slotId: slot._id,
        });
      }

      const remainingHours = payload.totalHours - totalBookedHours;
      if (remainingHours < 0)
        throw new BadRequestException('Booked hours exceed total requested');

      const status =
        remainingHours === 0
          ? BookingStatus.FULLY_BOOKED
          : totalBookedHours === 0
            ? BookingStatus.PENDING
            : BookingStatus.PARTIALLY_BOOKED;

      const pricePerHourLocked = instructorPackage.amount;
      const totalAmountPaid = payload.totalHours * pricePerHourLocked; // amount should be calculated for total hure
      /**
       * Todo: Insert Credit logic
       * Todo: Insert audit logic
       */

      const booking = await this.bookingModel.create({
        learnerId: leaner._id,
        instructorId: instructor._id,
        totalHoursPurchased: payload.totalHours,
        totalHoursBooked: totalBookedHours,
        remainingHours,
        pricePerHourLocked,
        totalAmountPaid,
        status,
      });

      for (const lesson of lessonsData) {
        await this.lessonModel.create({
          bookingId: booking._id,
          ...lesson,
        });

        await this.slotModel.updateOne(
          { _id: lesson.slotId },
          { $set: { status: SlotStatus.BOOKED, lockedAt: new Date() } },
        );
      }

      return booking;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException('Something went wrong');
    }
  }

  public async status(currentUser: JwtPayload, payload: CreateBookingDto) {
    return {
      messge: 'status hit without no logic',
    };
  }

  private parseTime(time: string): [number, number] {
    const parts = time.split(':').map(Number);
    if (parts.length !== 2 || parts.some(isNaN)) {
      throw new BadRequestException(`Invalid time format: ${time}`);
    }
    return parts as [number, number];
  }
}
