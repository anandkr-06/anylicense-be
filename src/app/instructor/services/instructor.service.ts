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
  UpdateInstructorProfileDto,
} from '../dto/update-instructor-profile.dto';
import { UserRole } from '@constant/users';
import { CryptoHelper } from '@common/helpers/crypto.helper';
import { comparePassword, hashPassword } from '@common/helpers/bcrypt.helper';
import { UpdateVehicleDto } from '../dto/update-vehicle.dto';
import { UpdatePrivateVehicleDto } from '../dto/update-private-vehicle.dto';
import { InstructorProfileDocument, InstructorProfile } from '@common/db/schemas/instructor-profile.schema';
import { UpdateFinancialDetailsDto } from '../dto/update-financial-details.dto'
import { UpdateDocumentsDto } from '../dto/update-documents.dto'
import { ServiceAreaDto } from '../dto/service-area.dto'
import { AvailabilityWeekDto } from '../dto/week.dto'
import { AvailabilityDayDto as AvailabilityDay } from '../dto/availability-day.dto'
import { CheckAvailabilityDto } from '../dto/check-availability.dto';
import { Order, OrderDocument } from '@common/db/schemas/order.schema';
import { amPmTo24, convertTo24Hour, normalizeAndValidateSlots, toAmPm, validateSlotDuration, splitSlotByDuration, isOverlapping, toAmPmNew, normalizeDate, normalizeTime, calculateDuration } from '@constant/slots';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { OrderLean } from '@constant/helper';
import { TestLocationDto } from '../dto/testlocation.dto';

type BookedSlot = {
  date: string;
  startTime: string;
  endTime: string;
};


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
    @InjectPinoLogger(InstructorService.name)
    private readonly logger: PinoLogger,
  ) { }


  async getBookedSlotsOnly(
    instructorId: string,
    fromDate?: string,
    duration?: 1 | 2 | 2.5,
  ) {
    try {
      if (fromDate && !/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) {
        throw new BadRequestException('fromDate must be YYYY-MM-DD');
      }

      const startDate = fromDate ?? this.getTodayISODate();

      const endDate = new Date(`${startDate}T00:00:00`);
      endDate.setDate(endDate.getDate() + 6);
      const endDateISO = endDate.toISOString().split('T')[0];
      if (!endDateISO) {
        throw new BadRequestException("Missing end date!");
      }
      // 1️⃣ Instructor
      const instructor = await this.instructorProfileModel
        .findOne({ userId: new Types.ObjectId(instructorId) })
        .lean();

      if (!instructor) {
        throw new NotFoundException('Instructor not found');
      }

      const hasDuration = typeof duration === 'number';
      const durationMinutes = hasDuration ? duration * 60 : null;

      // 2️⃣ Orders
      const orders = await this.orderModel
        .find({
          instructorId: instructor._id,
          status: { $in: ['CONFIRMED', 'PAID'] },
        })
        .select('_id bookedSlots status learnerId vehicleType')
        .populate({
          path: 'learnerId',
          select: 'firstName lastName mobileNumber profileImage',
        })
        .lean<OrderLean[]>();
        // this.logger.info(`Getting order details: ${JSON.stringify(orders)}`)

      // 3️⃣ Booked map
      const bookedMap = new Map<string, any[]>();

      for (const order of orders) {
        
        for (const slot of order.bookedSlots || []) {
          
          if (!slot.date || !slot.startTime || !slot.endTime) continue;
          
          const slotDate = normalizeDate(slot.date);

         // if (slotDate < startDate || slotDate > endDateISO) continue;

          //if (!bookedMap.has(slotDate)) {
            bookedMap.set(slotDate, []);
          //}
          
          bookedMap.get(slotDate)!.push({
            start: slot.startTime,
            end: slot.endTime,
            bookedSlotId: slot._id.toString(),
            status: slot.status,
            pickupLocation: slot.pickupLocation,
            orderId: order._id.toString(),
            bookingStatus: order.status,
            vehicleType: order.vehicleType,
            learner: order.learnerId
              ? {
                firstName: order.learnerId.firstName,
                lastName: order.learnerId.lastName,
                profileImage: order.learnerId.profileImage,
                mobileNumber: order.learnerId.mobileNumber,
              }
              : null,
          });
        }
      }




      // 4️⃣ Availability matching
      const result: any[] = [];

      for (const week of instructor.availability?.weeks || []) {
        for (const day of week.days) {
          if (day.date < startDate || day.date > endDateISO) continue;

          const bookedForDay = bookedMap.get(day.date) || [];
          if (!bookedForDay.length) continue;

          const slotsForDay: any[] = [];

          for (const avail of day.slots) {
            const splitSlots = hasDuration
              ? splitSlotByDuration(
                avail.startTime,
                avail.endTime,
                durationMinutes!,
              )
              : [{ startTime: avail.startTime, endTime: avail.endTime }];

            for (const s of splitSlots) {
              const sStart = normalizeTime(s.startTime);
              const sEnd = normalizeTime(s.endTime);

              const booking = bookedForDay.find(b =>
                isOverlapping(
                  sStart,
                  sEnd,
                  normalizeTime(b.start),
                  normalizeTime(b.end),
                ),
              );

              if (!booking) continue;

              slotsForDay.push({
                startTime: toAmPm(sStart),
                endTime: toAmPm(sEnd),
                duration: duration ?? calculateDuration(sStart,sEnd).hours,
                isBooked: true,
                orderId: booking.orderId,
                bookingStatus: booking.bookingStatus,
                learner: booking.learner,
                vehicleType: booking.vehicleType,
                pickupLocation: booking.pickupLocation,
                bookedSlotId: booking.bookedSlotId,
                status: booking.status,
                instructorId:instructorId
              });
            }

          }

          if (slotsForDay.length) {
            result.push({
              date: day.date,
              slots: slotsForDay,
            });
          }
        }
      }

      return result;
    } catch (error) {
      this.logger.error({ error }, 'getBookedSlotsOnly failed');
      throw error;
    }
  }




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
    const instructor = await this.instructorProfileModel.findOne({
      userId: new Types.ObjectId(userId),
    });

    if (!instructor) {
      throw new NotFoundException('Instructor not found');
    }

    const orders = await this.orderModel
      .find({ instructorId: instructor._id }, { bookedSlots: 1,reschedule:1 })
      .populate({
        path: 'learnerId',
        select: 'firstName lastName email profileImage mobileNumber',
      })
      .sort({ createdAt: -1 })
      .lean();

    // flatten learner info
    return orders.map(order => {
      const { learnerId, ...rest } = order;
      return {
        ...rest,
        learner: learnerId || null, // only keep 'learner'
      };
    });

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

  // async getAvailableSlots(
  //   instructorId: string,
  //   duration: 1 | 2 | 2.5,
  //   timeOfDay?: 'AM' | 'PM',
  // ) {
  //   const instructor = await this.instructorProfileModel
  //     .findOne({ userId: new Types.ObjectId(instructorId) })
  //     .lean<InstructorProfile>();

  //   if (!instructor) {
  //     throw new NotFoundException('Instructor not found');
  //   }

  //   const today = this.getTodayISODate();
  //   const durationMinutes = duration * 60;
  //   const result = [];

  //   for (const week of instructor.availability?.weeks || []) {
  //     for (const day of week.days) {
  //       if (day.date < today) continue;

  //       const slotsForDay = [];

  //       for (const slot of day.slots) {
  //         if (slot.isBooked) continue;

  //         // 🔥 Split with 30 min gap
  //         const splitSlots = splitSlotByDuration(
  //           slot.startTime,
  //           slot.endTime,
  //           durationMinutes,
  //         );

  //         for (const s of splitSlots) {
  //           const hour = Number(s.startTime.split(':')[0]);

  //           // AM / PM filter
  //           if (timeOfDay) {
  //             if (timeOfDay === 'AM' && hour >= 12) continue;
  //             if (timeOfDay === 'PM' && hour < 12) continue;
  //           }

  //           slotsForDay.push({
  //             startTime: toAmPm(s.startTime),
  //             endTime: toAmPm(s.endTime),
  //             duration,
  //           });
  //         }
  //       }

  //       if (slotsForDay.length) {
  //         result.push({
  //           date: day.date,
  //           slots: slotsForDay,
  //         });
  //       }
  //     }
  //   }

  //   return result;
  // }

  // async getAvailableSlots(
  //   instructorId: string,
  //   duration: 1 | 2 | 2.5,
  //   timeOfDay?: 'AM' | 'PM',
  // ) {
  //   // 1️⃣ Find instructor
  //   const instructor = await this.instructorProfileModel
  //     .findOne({ userId: new Types.ObjectId(instructorId) })
  //     .lean<InstructorProfile>();

  //   this.logger.info(`WEEKCHECK - ${JSON.stringify(instructor?.availability.weeks)}`)
  //   if (!instructor) {
  //     throw new NotFoundException('Instructor not found');
  //   }

  //   const today = this.getTodayISODate();
  //   const durationMinutes = duration * 60;
  //   const result = [];

  //   // 2️⃣ Fetch all booked slots for instructor
  //   const bookedSessions = await this.orderModel
  //     .find({
  //       instructorId: instructorId,
  //       status: { $in: ['CONFIRMED', 'PAID'] },
  //       date: { $gte: today },
  //     })
  //     .select('date startTime endTime')
  //     .lean<BookedSlot[]>();

  //   // 3️⃣ Group booked slots by date
  //   const bookedMap = new Map<
  //     string,
  //     { start: string; end: string }[]
  //   >();

  //   for (const b of bookedSessions) {
  //     if (!bookedMap.has(b.date)) {
  //       bookedMap.set(b.date, []);
  //     }

  //     bookedMap.get(b.date)!.push({
  //       start: b.startTime,
  //       end: b.endTime,
  //     });
  //   }


  //   // 4️⃣ Iterate availability
  //   for (const week of instructor.availability?.weeks || []) {
      
  //     for (const day of week.days) {
  //       if (day.date < today) continue;
        
  //       const slotsForDay = [];
  //       const bookedForDay = bookedMap.get(day.date) || [];

  //       for (const slot of day.slots) {
            
  //         // 🔥 Split availability slot by duration
  //         const splitSlots = splitSlotByDuration(
  //           slot.startTime,
  //           slot.endTime,
  //           durationMinutes,
  //         );

  //         for (const s of splitSlots) {
  //           // 5️⃣ Check overlap with booked slots
  //           this.logger.info(`to check: ${JSON.stringify(s)}`)
            
  //           const hasConflict = bookedForDay.some(b =>
  //             this.isOverlapping(
  //               s.startTime,
  //               s.endTime,
  //               b.start,
  //               b.end,
  //             ),
  //           );

  //           if (hasConflict) continue;

  //           const hour = Number(s.startTime.split(':')[0]);

  //           // 6️⃣ AM / PM filter
  //           if (timeOfDay) {
  //             if (timeOfDay === 'AM' && hour >= 12) continue;
  //             if (timeOfDay === 'PM' && hour < 12) continue;
  //           }

  //           slotsForDay.push({
  //             startTime: toAmPm(s.startTime),
  //             endTime: toAmPm(s.endTime),
  //             duration,
              
  //           });
  //         }
  //       }

  //       if (slotsForDay.length) {
  //         result.push({
  //           date: day.date,
  //           slots: slotsForDay,
  //         });
  //       }
  //     }
  //   }

  //   return result;
  // }
  async getAvailableSlots(
    instructorId: string,
    duration: 1 | 2 | 2.5,
    timeOfDay?: 'AM' | 'PM',
  ) {
    const instructor = await this.instructorProfileModel
      .findOne({ userId: new Types.ObjectId(instructorId) })
      .lean<InstructorProfile>();
  
    if (!instructor) {
      throw new NotFoundException('Instructor not found');
    }
  
    const today = this.getTodayISODate();
    const durationMinutes = duration * 60;
    const result = [];
  
    const bookedSessions = await this.orderModel
      .find({
        instructorId,
        status: { $in: ['CONFIRMED', 'PAID'] },
        date: { $gte: today },
      })
      .select('date startTime endTime')
      .lean<BookedSlot[]>();
  
    const bookedMap = new Map<string, { start: string; end: string }[]>();
  
    for (const b of bookedSessions) {
      if (!bookedMap.has(b.date)) bookedMap.set(b.date, []);
      bookedMap.get(b.date)!.push({ start: b.startTime, end: b.endTime });
    }
  
    for (const week of instructor.availability?.weeks || []) {
      for (const day of week.days) {
        if (day.date < today) continue;
  
        const slotsForDay = [];
        const bookedForDay = bookedMap.get(day.date) || [];
  
        // for (const slot of day.slots) {
        //   const splitSlots = splitSlotByDuration(
        //     slot.startTime,
        //     slot.endTime,
        //     durationMinutes,
        //   );
  
        //   for (const s of splitSlots) {
        //     const isBooked = bookedForDay.some(b =>
        //       this.isOverlapping(
        //         s.startTime,
        //         s.endTime,
        //         b.start,
        //         b.end,
        //       ),
        //     );
  
        //     const hour = Number(s.startTime.split(':')[0]);
  
        //     if (timeOfDay) {
        //       if (timeOfDay === 'AM' && hour >= 12) continue;
        //       if (timeOfDay === 'PM' && hour < 12) continue;
        //     }
  
        //     slotsForDay.push({
        //       startTime: toAmPm(s.startTime),
        //       endTime: toAmPm(s.endTime),
        //       duration,
        //       isBooked, // ✅ TRUE if booked, FALSE if free
        //     });
        //   }
        // }

        for (const slot of day.slots) {
          const splitSlots = splitSlotByDuration(
            slot.startTime,
            slot.endTime,
            durationMinutes,
          );
        
          for (const s of splitSlots) {
        
            const hour = Number(s.startTime.split(':')[0]);
        
            if (timeOfDay) {
              if (timeOfDay === 'AM' && hour >= 12) continue;
              if (timeOfDay === 'PM' && hour < 12) continue;
            }
        
            slotsForDay.push({
              startTime: toAmPm(s.startTime),
              endTime: toAmPm(s.endTime),
              duration,
              isBooked: slot.isBooked === true, // ✅ SOURCE OF TRUTH
            });
          }
        }
        
  
        if (slotsForDay.length) {
          result.push({
            date: day.date,
            slots: slotsForDay,
          });
        }
      }
    }
  
    return result;
  }
  

  private isOverlapping(
    startA: string,
    endA: string,
    startB: string,
    endB: string,
  ): boolean {
    return (
      this.amPmToMinutes(startA) < this.amPmToMinutes(endB) &&
      this.amPmToMinutes(endA) > this.amPmToMinutes(startB)
    );
  }


  private amPmToMinutes(time: string): number {
    // Expected: "09:00 AM"
    this.logger.info(`time:${time}`)
    const match = time.trim().match(/^(\d{1,2}):(\d{2})\s(AM|PM)$/);

    if (!match) {
      throw new Error(`Invalid time format: ${time}`);
    }

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    const modifier = match[3]; // AM | PM

    if (modifier === 'PM' && hours !== 12) {
      return (hours + 12) * 60 + minutes;
    }

    if (modifier === 'AM' && hours === 12) {
      return minutes; // midnight
    }

    return hours * 60 + minutes;
  }





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
      const t = time.toUpperCase().includes('AM') || time.toUpperCase().includes('PM')
        ? amPmTo24(time)   // 👈 convert only if needed
        : time;

      const [h, m] = t.split(':').map(Number);

      if (h === undefined || m === undefined || isNaN(h) || isNaN(m)) {
        throw new BadRequestException(`Invalid time format: ${time}`);
      }

      return h * 60 + m;
    };


    // ---------------------------------------------------
    // 1️⃣ Group requested slots by date
    // ---------------------------------------------------
    const slotsByDate = new Map<
      string,
      { start: number; end: number; raw: any }[]
    >();

    for (const slot of dto.slots) {
      const start = toMinutes(slot.startTime);
      const end = toMinutes(slot.endTime);

      if (start >= end) {
        throw new BadRequestException(
          `Invalid slot time ${slot.startTime} - ${slot.endTime}`,
        );
      }

      if (!slotsByDate.has(slot.date)) {
        slotsByDate.set(slot.date, []);
      }

      slotsByDate.get(slot.date)!.push({
        start,
        end,
        raw: slot,
      });
    }


    // ---------------------------------------------------
    // 2️⃣ Validate each day independently
    // ---------------------------------------------------
    for (const [date, slots] of slotsByDate.entries()) {
      // ⏱ sort slots by start time
      slots.sort((a, b) => a.start - b.start);

      // 🔥 30-minute gap & overlap validation
      for (let i = 1; i < slots.length; i++) {
        const prev = slots[i - 1];
        const curr = slots[i];
        if (!curr || !prev) continue; // ⚠️ Type guard

        // ❌ overlap
        if (curr.start < prev.end) {
          return {
            available: false,
            message: `Overlapping slots on ${date}`,
          };
        }

        // ❌ less than 30 min gap
        const gap = curr.start - prev.end;
        if (gap < 30) {
          return {
            available: false,
            message: `Minimum 30 minutes gap required between slots on ${date}`,
          };
        }
      }

      // ---------------------------------------------------
      // 3️⃣ Check against instructor availability
      // ---------------------------------------------------
      for (const req of slots) {
        let matchedSlot = null;

        for (const week of instructor.availability?.weeks || []) {
          for (const day of week.days) {
            if (day.date !== date) continue;

            for (const slot of day.slots) {
              const dbStart = toMinutes(slot.startTime);
              const dbEnd = toMinutes(slot.endTime);

              // ✅ containment check
              if (req.start >= dbStart && req.end <= dbEnd) {
                matchedSlot = slot;
                break;
              }
            }
          }
        }

        if (!matchedSlot) {
          return {
            available: false,
            message: `Requested slot is outside instructor availability on ${date} (${req.raw.startTime} - ${req.raw.endTime})`,
          };
        }

        if (matchedSlot.isBooked) {
          return {
            available: false,
            message: `Slot already booked on ${date} (${req.raw.startTime} - ${req.raw.endTime})`,
          };
        }
      }
    }

    // ---------------------------------------------------
    // ✅ All checks passed
    // ---------------------------------------------------
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

        // ✅ Only minimum 1 hour validation
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
    // 5️⃣ Normalize + validate slots (SAME RULES)
    //    ✔ AM/PM → 24h
    //    ✔ Minimum duration: 1 hour
    //    ✔ No overlaps
    //    ✔ Minimum 30-minute gap
    //    ✔ No max duration restriction
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








  // 4️⃣ GET AVAILABILITY WITHOUT PAGINATION
  // async getAvailability(userId: string) {
  //   const profile = await this.instructorProfileModel.findOne(
  //     { userId: new Types.ObjectId(userId) },
  //     { availability: 1 }
  //   ).lean();

  //   if (!profile) throw new NotFoundException('Instructor not found');

  //   const availability = profile.availability;

  //   return {
  //     ...availability,
  //     weeks: availability.weeks.map(week => ({
  //       ...week,
  //       days: week.days.map(day => ({
  //         ...day,
  //         slots: day.slots.map(slot => ({
  //           ...slot,
  //           startTime: toAmPm(slot.startTime),
  //           endTime: toAmPm(slot.endTime),
  //         })),
  //       })),
  //     })),
  //   };
  // }

  async getAvailabilityPaginated(
    userId: string,
    page = 1,
    limit = 1, // 👈 weeks per page
    startDate?: string,
    endDate?: string,
  ) {
    const skip = (page - 1) * limit;
  
    const match: any = {
      userId: new Types.ObjectId(userId),
    };
  
    const dateFilter: any = {};
    if (startDate) dateFilter.$gte = startDate;
    if (endDate) dateFilter.$lte = endDate;
  
    const pipeline: any[] = [
      { $match: match },
  
      {
        $project: {
          weeks: {
            $filter: {
              input: '$availability.weeks',
              as: 'week',
              cond: {
                $and: [
                  startDate
                    ? { $gte: ['$$week.endDate', startDate] }
                    : { $const: true },
                  endDate
                    ? { $lte: ['$$week.startDate', endDate] }
                    : { $const: true },
                ],
              },
            },
          },
        },
      },
  
      {
        $project: {
          totalWeeks: { $size: '$weeks' },
          weeks: { $slice: ['$weeks', skip, limit] },
        },
      },
    ];
  
    const result = await this.instructorProfileModel.aggregate(pipeline);
  
    if (!result.length) {
      throw new NotFoundException('Instructor profile not found');
    }
  
    const weeks = result[0].weeks ?? [];
    const totalWeeks = result[0].totalWeeks ?? 0;
  
    return {
      weeks,
      pagination: {
        page,
        limit,
        totalWeeks,
        totalPages: Math.ceil(totalWeeks / limit),
      },
    };
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

  async updateTestLocations(
    userId: string,
    testLocations: TestLocationDto[]
  ) {
    try {


      const instructor = await this.instructorProfileModel.findOneAndUpdate(
        { userId: new Types.ObjectId(userId) },
        { $set: { testLocations } },
        { new: true }
      );

      if (!instructor) {
        throw new NotFoundException('Instructor profile not found');
      }

      return {
        message: 'Test locations updated successfully',
      };
    } catch (error) {
      console.error('UPDATE TEST LOCATIONS ERROR:', error);
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


  private _buildUserRespons(user: UserDocument): UserResponse {
    return new UserResponseBuilder(user).build();
  }
}


