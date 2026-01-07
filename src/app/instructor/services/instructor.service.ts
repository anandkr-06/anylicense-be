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
import { InstructorProfileDocument, InstructorProfile, TimeSlot } from '@common/db/schemas/instructor-profile.schema';
import {UpdateFinancialDetailsDto} from '../dto/update-financial-details.dto'
import {UpdateDocumentsDto} from '../dto/update-documents.dto'
import {ServiceAreaDto} from '../dto/service-area.dto'
import {UpdateAvailabilityDto} from '../dto/update-availability.dto'
import {AvailabilityWeekDto} from '../dto/week.dto'
import {AvailabilityDayDto as AvailabilityDay} from '../dto/availability-day.dto'
import { CheckAvailabilityDto } from '../dto/check-availability.dto'; 
import { CreateOrderDto } from '../dto/create-order.dto';
import { Order, OrderDocument } from '@common/db/schemas/order.schema';
import { amPmTo24, convertTo24Hour, normalizeAndValidateSlots, toAmPm, validateSlotDuration } from '@constant/slots';

import { CreateDaySlotDto } from '../dto/create-slot.dto';


@Injectable()
export class InstructorService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly cryptoHelper: CryptoHelper,
    private readonly userDbService: UserDbService,
    private readonly packageDbService: PackageDbService,
    @InjectModel(InstructorProfile.name) private instructorProfileModel: Model<InstructorProfileDocument>,
    @InjectModel(Order.name) 
            private readonly orderModel: Model<OrderDocument>,
  ) {}

  async getInstructorBookedSlots(userId: string) {
    const instructor = await this.instructorProfileModel.findOne({ userId });
  
    if (!instructor) {
      throw new NotFoundException('Instructor not found');
    }
  
    const bookedSlots = [];
  
    for (const week of instructor.availability.weeks) {
      for (const day of week.days) {
        for (const slot of day.slots) {
          if (slot.isBooked && slot.bookingId) {
            bookedSlots.push({
              date: day.date,
              startTime: slot.startTime,
              endTime: slot.endTime,
              bookingId: slot.bookingId,
            });
          }
        }
      }
    }
  
    return bookedSlots;
  }
  
  async getOrdersForInstructor(userId: string) {
    const instructor = await this.instructorProfileModel.findOne({userId: new Types.ObjectId(userId)});
  
    if (!instructor) {
      throw new NotFoundException('Instructor not found');
    }
  
    return this.orderModel
      .find({ instructorId: instructor.userId.toString() })
      .populate('learnerId', 'fullName profileImage')
      .sort({ createdAt: -1 })
      .lean();

  }

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
  
  private findSlot(
    instructor: InstructorProfile,
    reqSlot: {
      date: string;
      startTime: string;
      endTime: string;
    },
  ) {
    for (const week of instructor.availability?.weeks || []) {
      for (const day of week.days) {
        if (day.date !== reqSlot.date) continue;
  
        return day.slots.find(
          slot =>
            slot.startTime === reqSlot.startTime &&
            slot.endTime === reqSlot.endTime,
        );
      }
    }
  
    return null;
  }
  
  
  
  

  private getTodayISODate(): string {
    return new Date().toISOString().slice(0, 10);
  }
  
  async getAvailableSlots(
    instructorId: string,
    timeOfDay?: 'AM' | 'PM',
  ) {
    const instructor = await this.instructorProfileModel
      .findOne({ userId: new Types.ObjectId(instructorId) })
      .lean<InstructorProfile>();
  
    if (!instructor) {
      throw new NotFoundException('Instructor not found');
    }
  
    const today = this.getTodayISODate();
    const result = [];
  
    for (const week of instructor.availability?.weeks || []) {
      for (const day of week.days) {
        if (day.date < today) continue;
  
        const validSlots = day.slots
          .filter(slot => {
            if (slot.isBooked) return false;
  
            if (timeOfDay) {
              const hour = Number(slot.startTime.split(':')[0]);
              return timeOfDay === 'AM' ? hour < 12 : hour >= 12;
            }
  
            return true;
          })
          .map(slot => ({
            ...slot,
            startTime: toAmPm(slot.startTime),
            endTime: toAmPm(slot.endTime),
          }));
  
        if (validSlots.length) {
          result.push({
            date: day.date,
            slots: validSlots,
          });
        }
      }
    }
  
    return result;
  }
  
  
  

    

  // async checkAvailability(
  //   instructorId: string,
  //   dto: CheckAvailabilityDto,
  // ) {
  //   const instructor = await this.instructorProfileModel.findOne({
  //     userId: new Types.ObjectId(instructorId),
  //   });
  
  //   if (!instructor) {
  //     throw new NotFoundException('Instructor not found');
  //   }
  
  //   // 🔥 Normalize AM/PM → 24h
  //   const normalizedSlots = dto.slots.map(slot => ({
  //     ...slot,
  //     startTime: amPmTo24(slot.startTime),
  //     endTime: amPmTo24(slot.endTime),
  //   }));
    

  
  //   for (const reqSlot of normalizedSlots) {
  //     const slot = this.findSlot(instructor, reqSlot);
  
  //     if (!slot) {
  //       return {
  //         available: false,
  //         message: `Slot not found on ${reqSlot.date} ${reqSlot.startTime}-${reqSlot.endTime} ${JSON.stringify(dto.slots, null, 2)}`,
  //       };
  //     }
  
  //     if (slot.isBooked) {
  //       return {
  //         available: false,
  //         message: `Slot already booked on ${reqSlot.date} ${reqSlot.startTime}-${reqSlot.endTime}`,
  //       };
  //     }
  //   }
  
  //   return {
  //     available: true,
  //     validSlots: normalizedSlots.length,
  //     message: 'All requested slots are available',
  //   };
  // }
  
  
async checkAvailability(
  instructorId: string,
  dto: CheckAvailabilityDto,
) {
  const instructor = await this.instructorProfileModel.findOne({
    userId: new Types.ObjectId(instructorId),
  });

  if (!instructor) {
    throw new NotFoundException('Instructor not found');
  }

  // 🔥 helper → AM/PM or 24h → minutes
  const toMinutes = (time: string): number => {
    const t = amPmTo24(time); // must return HH:mm
    const [h, m] = t.split(':').map(Number);
    if (h === undefined || m === undefined) {
      throw new BadRequestException('Invalid time format');
    }
    return h * 60 + m;
  };

  for (const reqSlot of dto.slots) {
    const reqStart = toMinutes(reqSlot.startTime);
    const reqEnd = toMinutes(reqSlot.endTime);

    let matchedSlot = null;

    for (const week of instructor.availability?.weeks || []) {
      for (const day of week.days) {
        if (day.date !== reqSlot.date) continue;

        for (const slot of day.slots) {
          const dbStart = toMinutes(slot.startTime);
          const dbEnd = toMinutes(slot.endTime);

          if (dbStart === reqStart && dbEnd === reqEnd) {
            matchedSlot = slot;
            break;
          }
        }
      }
    }

    if (!matchedSlot) {
      return {
        available: false,
        message: `Slot not found on ${reqSlot.date} ${reqSlot.startTime}-${reqSlot.endTime}`,
      };
    }

    if (matchedSlot.isBooked) {
      return {
        available: false,
        message: `Slot already booked on ${reqSlot.date} ${reqSlot.startTime}-${reqSlot.endTime}`,
      };
    }
  }

  return {
    available: true,
    validSlots: dto.slots.length,
    message: 'All requested slots are available',
  };
}


  async appendWeek(
    userId: string,
    {
      startDate,
      endDate,
      days,
    }: {
      startDate: string;
      endDate: string;
      days: {
        date: string;
        slots: { startTime: string; endTime: string }[];
      }[];
    },
  ) {
    // --------------------------------------------------
    // 1️⃣ Date validations
    // --------------------------------------------------
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
  
    // --------------------------------------------------
    // 2️⃣ Normalize days & slots
    // --------------------------------------------------
    const normalizedDays = days.map(day => {
      // const convertedSlots = day.slots.map(slot => {
      //   const start = convertTo24Hour(slot.startTime);
      //   const end = convertTo24Hour(slot.endTime);
  
      //   if (start >= end) {
      //     throw new BadRequestException(
      //       `Invalid slot time ${slot.startTime} - ${slot.endTime} on ${day.date}`,
      //     );
      //   }
  
      //   return {
      //     startTime: start,
      //     endTime: end,
      //     isBooked: false,
      //     bookingId: undefined,
      //   };
      // });
  
      // 🧠 sort & overlap check
      const convertedSlots = day.slots.map(slot => {
        const start = convertTo24Hour(slot.startTime);
        const end = convertTo24Hour(slot.endTime);
      
        if (start >= end) {
          throw new BadRequestException(
            `Invalid slot time ${slot.startTime} - ${slot.endTime} on ${day.date}`,
          );
        }
      
        // 🔥 Duration validation
        validateSlotDuration(start, end, day.date);
      
        return {
          startTime: start,
          endTime: end,
          isBooked: false,
          bookingId: undefined,
        };
      });
      
      const sortedSlots = convertedSlots.sort((a, b) =>
        a.startTime.localeCompare(b.startTime),
      );
      
      for (let i = 1; i < sortedSlots.length; i++) {
        const prev = sortedSlots[i - 1];
        const curr = sortedSlots[i];
      
        if (!prev || !curr) continue; // ⚠️ Type guard
      
        // ❌ overlap check
        if (curr.startTime < prev.endTime) {
          throw new BadRequestException(
            `Overlapping slots on ${day.date}`,
          );
        }
      
        // ⏱️ 30-minute gap validation
        const prevEndMinutes =
          Number(prev.endTime.slice(0, 2)) * 60 +
          Number(prev.endTime.slice(3));
      
        const currStartMinutes =
          Number(curr.startTime.slice(0, 2)) * 60 +
          Number(curr.startTime.slice(3));
      
        const gap = currStartMinutes - prevEndMinutes;
      
        if (gap < 30) {
          throw new BadRequestException(
            `Minimum 30 minutes gap required between slots on ${day.date}`,
          );
        }
      }
      
      
  
      return {
        date: day.date,
        slots: sortedSlots,
      };
    });
  
    // --------------------------------------------------
    // 3️⃣ Build week object
    // --------------------------------------------------
    const week = {
      weekId,
      startDate,
      endDate,
      days: normalizedDays,
    };
  
    // --------------------------------------------------
    // 4️⃣ Atomic append (no overwrite, no overlap)
    // --------------------------------------------------
    const result = await this.instructorProfileModel.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
  
        // prevent duplicate weekId
        'availability.weeks.weekId': { $ne: weekId },
  
        // prevent overlapping date ranges
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
      { new: true },
    );
  
    if (!result) {
      throw new BadRequestException(
        'Week overlaps existing availability or already exists',
      );
    }
  
    // return {
    //   message: 'Week added successfully',
    //   week,
    // };
    return {
      message: 'Week added successfully',
      week: {
        weekId,
        startDate,
        endDate,
        days: normalizedDays.map(day => ({
          date: day.date,
          slots: day.slots.map(slot => ({
            startTime: slot.startTime,
            endTime: slot.endTime,
            isBooked: slot.isBooked ?? false,
          })),
        })),
      },
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
  body: AvailabilityWeekDto,
) {
  if (!/^\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}$/.test(weekId)) {
    throw new BadRequestException('Invalid weekId format');
  }

  const profile = await this.instructorProfileModel.findOne({
    userId: new Types.ObjectId(userId),
  });

  if (!profile) {
    throw new NotFoundException('Instructor not found');
  }

  const week = profile.availability.weeks.find(
    w => w.weekId === weekId,
  );

  if (!week) {
    throw new NotFoundException('Week not found');
  }

  // ❌ Prevent date range change
  if (
    body.startDate !== week.startDate ||
    body.endDate !== week.endDate
  ) {
    throw new BadRequestException(
      'Week date range cannot be changed. Create a new week instead.',
    );
  }

  // ✅ Normalize + validate slots (same rules as appendWeek)
  for (const day of body.days) {
    day.slots = normalizeAndValidateSlots(
      day.slots,
      day.date,
    );
  }

  week.days = body.days;

  await profile.save();

  return { message: 'Week slots updated successfully' };
}


// private normalizeAndValidateSlots(slots: any[]) {
//   const normalized = slots.map(slot => ({
//     ...slot,
//     startTime: convertTo24Hour(slot.startTime),
//     endTime: convertTo24Hour(slot.endTime),
//   }));

//   const sorted = normalized.sort((a, b) =>
//     a.startTime.localeCompare(b.startTime),
//   );

//   for (let i = 1; i < sorted.length; i++) {
//     if (sorted[i].startTime < sorted[i - 1].endTime) {
//       throw new BadRequestException('Slots are overlapping');
//     }
//   }

//   return sorted;
// }

// async updateWeek(
//   userId: string,
//   weekId: string,
//   body: AvailabilityWeekDto,
// ) {
//   // -----------------------------------------------------
//   // 1️⃣ Validate weekId
//   // -----------------------------------------------------
//   if (!/^\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}$/.test(weekId)) {
//     throw new BadRequestException('Invalid weekId format');
//   }

//   // -----------------------------------------------------
//   // 2️⃣ Fetch instructor profile
//   // -----------------------------------------------------
//   const profile = await this.instructorProfileModel.findOne({
//     userId: new Types.ObjectId(userId),
//   });
//   if (!profile) {
//     throw new NotFoundException('Instructor not found');
//   }

//   const index = profile.availability.weeks.findIndex(
//     w => w.weekId === weekId,
//   );

//   if (index === -1) {
//     throw new NotFoundException('Week not found');
//   }

//   // -----------------------------------------------------
//   // 3️⃣ Normalize & validate week slots
//   // -----------------------------------------------------
//   const normalizedWeek = {
//     ...body,
//     weekId,
//     days: body.days.map(day => {
//       if (!day.slots?.length) return day;

//       // 🚫 Prevent editing booked slots
//       const existingDay = profile.availability?.weeks[index]?.days.find(
//         d => d.date === day.date,
//       );

//       if (existingDay?.slots.some(s => s.isBooked)) {
//         throw new BadRequestException(
//           `Cannot modify booked slots on ${day.date}`,
//         );
//       }

//       // Convert & validate slots
//       const convertedSlots = day.slots.map(slot => {
//         const start = convertTo24Hour(slot.startTime);
//         const end = convertTo24Hour(slot.endTime);
      
//         if (start >= end) {
//           throw new BadRequestException(
//             `Invalid slot time ${slot.startTime} - ${slot.endTime}`,
//           );
//         }
      
//         return {
//           startTime: start,
//           endTime: end,
//           isBooked: false,
//           bookingId: undefined,
//         };
//       });
      

//       // Overlap check (per day)
//       const sortedSlots = convertedSlots.sort(
//         (a, b) => a.startTime.localeCompare(b.startTime),
//       );
      

//       for (let i = 1; i < sortedSlots.length; i++) {
//         const prev = sortedSlots[i - 1];
//         if (!prev) {
//           throw new BadRequestException('Previous slot is undefined');
//         }
//         const curr = sortedSlots[i];
//         if (!curr) {
//           throw new BadRequestException('Current slot is undefined');
//         }
      
//         if (curr.startTime < prev.endTime) {
//           throw new BadRequestException(
//             `Overlapping slots on ${day.date}`,
//           );
//         }
//       }
      

//       return {
//         ...day,
//         slots: sortedSlots,
//       };
//     }),
//   };

//   // -----------------------------------------------------
//   // 4️⃣ Save updated week
//   // -----------------------------------------------------
//   profile.availability.weeks[index] = normalizedWeek;
//   await profile.save();

//   return { message: 'Week updated successfully' };
// }


async updateDaySlots(
  userId: string,
  weekId: string,
  body: {
    date: string;
    slots: { startTime: string; endTime: string }[];
  },
) {
  // -----------------------------------------------------
  // 1️⃣ Validate weekId
  // -----------------------------------------------------
  if (!/^\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}$/.test(weekId)) {
    throw new BadRequestException('Invalid weekId format');
  }

  // -----------------------------------------------------
  // 2️⃣ Fetch instructor profile
  // -----------------------------------------------------
  const profile = await this.instructorProfileModel.findOne({
    userId: new Types.ObjectId(userId),
  });

  if (!profile) {
    throw new NotFoundException('Instructor not found');
  }

  // -----------------------------------------------------
  // 3️⃣ Find week & day
  // -----------------------------------------------------
  const week = profile.availability.weeks.find(
    w => w.weekId === weekId,
  );
  if (!week) {
    throw new NotFoundException('Week not found');
  }

  const day = week.days.find(d => d.date === body.date);
  if (!day) {
    throw new BadRequestException('Date not in selected week');
  }

  // -----------------------------------------------------
  // 4️⃣ Prevent modifying booked slots
  // -----------------------------------------------------
  if (day.slots.some(slot => slot.isBooked)) {
    throw new BadRequestException(
      'Cannot modify slots that are already booked',
    );
  }

  // -----------------------------------------------------
  // 5️⃣ Normalize + validate slots
  //    ✔ AM/PM (upper/lower)
  //    ✔ 24h format
  //    ✔ Duration: 1h, 2h, 2.5h
  //    ✔ No overlaps
  // -----------------------------------------------------
  day.slots = normalizeAndValidateSlots(
    body.slots,
    body.date,
  );

  // -----------------------------------------------------
  // 6️⃣ Save
  // -----------------------------------------------------
  await profile.save();

  return { message: 'Day slots updated successfully' };
}





  

// 4️⃣ GET AVAILABILITY
async getAvailability(userId: string) {
  const profile = await this.instructorProfileModel.findOne(
    { userId: new Types.ObjectId(userId) },
    { availability: 1 }
  ).lean();

  if (!profile) throw new NotFoundException('Instructor not found');

  const availability = profile.availability;

  return {
    ...availability,
    weeks: availability.weeks.map(week => ({
      ...week,
      days: week.days.map(day => ({
        ...day,
        slots: day.slots.map(slot => ({
          ...slot,
          startTime: toAmPm(slot.startTime),
          endTime: toAmPm(slot.endTime),
        })),
      })),
    })),
  };
}

// async getAvailability(userId: string) {
//   const profile = await this.instructorProfileModel.findOne(
//     { userId: new Types.ObjectId(userId) },
//     { availability: 1 }
//   );

//   if (!profile) throw new NotFoundException('Instructor not found');

//   return profile.availability;
// }

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


