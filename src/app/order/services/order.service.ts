import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Logger } from 'nestjs-pino';

import { UserDbService } from '@common/db/services/user.db.service';
import { WalletService } from '@app/wallet/services/wallet.service';

import { Order, OrderDocument } from '@common/db/schemas/order.schema';
import { Learner, LearnerDocument } from '@common/db/schemas/learner.schema';
import {
  InstructorProfile,
  InstructorProfileDocument,
} from '@common/db/schemas/instructor-profile.schema';

import { CreateOrderDto, SlotType } from '../dto/create-order.dto';
import { PLATFORM_CHARGE } from '@constant/packages';
import { WalletTxnSource } from '@common/db/schemas/wallet-transaction.schema';
import { Slot, SlotDocument } from '@common/db/schemas/slot.schema';


interface InstructorHour {
  startTime: string;
  endTime: string;
  isBooked: boolean;
  orderId?: Types.ObjectId;
  type?: SlotType;
}
interface InstructorDay {
  date: string;
  hours: InstructorHour[];
}

interface NormalizedSlot {
  date: string;
  startTime: string; // 24h HH:mm
  endTime: string;
  type: SlotType;
  pickupAddress: string;
  suburb: string;
  state: string;
}


@Injectable()
export class OrderService {
  constructor(
    private readonly userDbService: UserDbService,
    private readonly walletService: WalletService,

    @InjectModel(InstructorProfile.name)
    private readonly instructorProfileModel: Model<InstructorProfileDocument>,

    @InjectModel(Slot.name)
    private readonly slotModel: Model<SlotDocument>,

    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,

    @InjectModel(Learner.name)
    private readonly learnerModel: Model<LearnerDocument>,

    private readonly logger: Logger,
  ) { }

  async createOrder(
    learnerId: string,
    dto: CreateOrderDto,
  ): Promise<OrderDocument> {

    // =====================================================
    // 1️⃣ Instructor
    // =====================================================
    const instructor = await this.instructorProfileModel.findOne({
      userId: new Types.ObjectId(dto.instructorId),
    });

    if (!instructor) {
      throw new NotFoundException('Instructor not found');
    }

    // =====================================================
    // 2️⃣ Vehicle & Pricing
    // =====================================================
    const vehicle = instructor.vehicles?.[dto.vehicleType];
    if (!vehicle?.hasVehicle || typeof vehicle.pricePerHour !== 'number') {
      throw new BadRequestException('Vehicle not available');
    }

    const vehiclePrice = vehicle.pricePerHour;
    const vehicleTestPrice = vehicle.testPricePerHour;

    // =====================================================
    // 3️⃣ Normalize Slots
    // =====================================================
    const normalizedSlots: NormalizedSlot[] = (dto.slots ?? []).map(s => ({
      date: s.date,
      type: s.type,
      startTime: this.amPmTo24(s.startTime),
      endTime: this.amPmTo24(s.endTime),
      pickupAddress: s.pickupAddress,
      suburb: s.suburb,
      state: s.state,
    }));

    // =====================================================
    // 4️⃣ Slot Validation
    // =====================================================
    let usedHours = 0;

    for (const slot of normalizedSlots) {
      const duration = this.validateSlotDuration(
        slot.startTime,
        slot.endTime,
        slot.type,
      );

      this.validateSlotAvailability(instructor, slot);
      usedHours += duration;
    }

    // ⏱️ 30-minute gap rule (same date)
    const sorted: NormalizedSlot[] = [...normalizedSlots].sort(
      (a, b) => this.toMinutes(a.startTime) - this.toMinutes(b.startTime),
    );

    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      const previous = sorted[i - 1];

      if (!current || !previous) continue; // ✅ TS + runtime safety

      if (current.date !== previous.date) continue;

      const gap =
        this.toMinutes(current.startTime) -
        this.toMinutes(previous.endTime);

      if (gap < 30) {
        throw new BadRequestException(
          `Minimum 30 minutes gap required on ${current.date}`,
        );
      }
    }


    // =====================================================
    // 5️⃣ Hours Calculation
    // =====================================================
    const lessonHours = dto.lessonHours ?? 0;
    const testHours = (dto.testCount ?? 0) * 2.5;
    const totalHours = lessonHours + testHours;

    if (totalHours === 0) {
      throw new BadRequestException(
        'At least one lesson or test must be booked',
      );
    }

    if (usedHours > totalHours) {
      throw new BadRequestException(
        'Slot hours exceed purchased hours',
      );
    }

    const remainingHours = totalHours - usedHours;

    // =====================================================
    // 6️⃣ Base Amount (NO discounts yet)
    // =====================================================
    let lessonAmount = 0;
    let testAmount = 0;

    if (lessonHours > 0) {
      lessonAmount = lessonHours * vehiclePrice;
    }

    if (dto.testCount && dto.testCount > 0 && vehicleTestPrice) {
      testAmount = dto.testCount * vehicleTestPrice;
    }

    const learnerValueAmount = lessonAmount + testAmount;

    // =====================================================
    // 7️⃣ Learner & Discounts
    // =====================================================
    const learnerObjectId = new Types.ObjectId(learnerId);
    const learner = await this.learnerModel.findById(learnerObjectId);

    if (!learner) {
      throw new NotFoundException('Learner not found');
    }

    let discount = 0;
    let couponDiscount = 0;

    if (lessonHours >= 5 && lessonHours < 10) {
      discount = lessonAmount * 0.1;
    }

    if (lessonHours >= 10) {
      discount = lessonAmount * 0.15;
    }

    if (dto.couponValue) {
      couponDiscount = Math.min(
        dto.couponValue,
        learnerValueAmount - discount,
      );
    }

    // =====================================================
    // 8️⃣ Wallet → Stripe Split (CORRECT ORDER)
    // =====================================================
    // const learnerPayable = Math.max(
    //   learnerValueAmount - discount - couponDiscount,
    //   0,
    // );

    // const walletUsed = Math.min(
    //   learner.walletBalance,
    //   learnerPayable,
    // );

    // const stripeForValue = Math.max(
    //   learnerPayable - walletUsed,
    //   0,
    // );

    // const platformCharge =
    //   stripeForValue > 0 ? PLATFORM_CHARGE : 0;

    // const totalAmount = learnerPayable + platformCharge;

    // const finalStripeAmount = Math.max(
    //   totalAmount - walletUsed,
    //   0,
    // );

    // =====================================================
    // 8️⃣ Wallet → Stripe Split (CORRECT ORDER)
    // =====================================================
    const learnerPayable = Math.max(
      learnerValueAmount - discount - couponDiscount,
      0,
    );

    const walletUsed = Math.min(
      learner.walletBalance,
      learnerPayable,
    );

    const stripeForValue = Math.max(
      learnerPayable - walletUsed,
      0,
    );

    // Platform fee ONLY if Stripe is involved
    const platformCharge =
      stripeForValue > 0 ? PLATFORM_CHARGE : 0;

    const totalAmount = learnerPayable + platformCharge;

    const payableAmount = learnerPayable;
    const grandTotal = learnerPayable + platformCharge;

    const finalStripeAmount = Math.max(
      grandTotal - walletUsed,
      0,
    );



    // =====================================================
    // 9️⃣ Consumed Amount
    // =====================================================
    // let consumedAmount = 0;

    // for (const slot of normalizedSlots) {
    //   const duration = this.validateSlotDuration(
    //     slot.startTime,
    //     slot.endTime,
    //     slot.type,
    //   );

    //   if (slot.type === 'LESSON') {
    //     consumedAmount += duration * vehiclePrice;
    //   }

    //   if (slot.type === 'TEST' && vehicleTestPrice) {
    //     consumedAmount += vehicleTestPrice;
    //   }
    // }

    // const walletCreditAfterBooking =
    //   learnerValueAmount - consumedAmount;

    // =====================================================
    // 9️⃣ Consumed Amount (ONLY booked slots)
    // =====================================================
    // let consumedAmount = 0;

    // for (const slot of normalizedSlots) {
    //   const duration = this.validateSlotDuration(
    //     slot.startTime,
    //     slot.endTime,
    //     slot.type,
    //   );

    //   if (slot.type === 'LESSON') {
    //     consumedAmount += duration * vehiclePrice;
    //   }

    //   if (slot.type === 'TEST' && vehicleTestPrice) {
    //     // Test is always fixed price (2.5 hrs)
    //     consumedAmount += vehicleTestPrice;
    //   }
    // }

    // // If no slots booked, nothing is consumed yet
    // if (normalizedSlots.length === 0) {
    //   consumedAmount = 0;
    // }

    // const walletCreditAfterBooking =
    //   learnerValueAmount - consumedAmount;

    // =====================================================
    // 9️⃣ Consumed Amount (ONLY booked slots)
    // =====================================================
    let consumedAmount = 0;

    for (const slot of normalizedSlots) {
      const duration = this.validateSlotDuration(
        slot.startTime,
        slot.endTime,
        slot.type,
      );

      if (slot.type === 'LESSON') {
        consumedAmount += duration * vehiclePrice;
      }

      if (slot.type === 'TEST' && vehicleTestPrice) {
        // TEST is fixed price (2.5 hrs)
        consumedAmount += vehicleTestPrice;
      }
    }

    // Safety
    consumedAmount = Math.min(consumedAmount, learnerValueAmount);

    const walletCreditAfterBooking =
      learnerValueAmount - consumedAmount;



    // =====================================================
    // 🔟 Order Create
    // =====================================================
    const order = await this.orderModel.create({
      learnerId: learnerObjectId,
      instructorId: instructor._id,
      vehicleType: dto.vehicleType,

      learnerValueAmount,
      consumedAmount,
      walletCreditAfterBooking,

      lessonHours,
      testHours,
      totalHours,

      usedHours,
      remainingHours,

      pricePerHour: vehiclePrice,
      totalAmount,
      payableAmount,
      walletUsed,
      stripeAmount: finalStripeAmount,

      bookingMode: normalizedSlots.length
        ? 'WITH_SLOTS'
        : 'WITHOUT_SLOTS',

      scheduleStatus: !normalizedSlots.length
        ? 'UNSCHEDULED'
        : remainingHours === 0
          ? 'FULLY_SCHEDULED'
          : 'PARTIALLY_SCHEDULED',

      status: finalStripeAmount === 0
        ? 'CONFIRMED'
        : 'PENDING_PAYMENT',

      paymentStatus: finalStripeAmount === 0
        ? 'PAID'
        : 'PENDING',

      bookedSlots: normalizedSlots.map(s => ({
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        type: s.type,
        pickupLocation: {
          pickupAddress: s.pickupAddress,
          suburb: s.suburb,
          state: s.state,
        },
      })),

      platformCharge,
      discount: discount + couponDiscount,
    });

    // =====================================================
    // 1️⃣1️⃣ Attach Slots
    // =====================================================
    for (const slot of normalizedSlots) {
      this.attachBookingByRange(instructor, slot, order._id);
    }

    if (normalizedSlots.length) {
      await instructor.save();
    }

    // =====================================================
    // 1️⃣2️⃣ Wallet Debit (ONLY wallet-only orders)
    // =====================================================
    if (walletUsed > 0) {
      await this.walletService.debitWallet(
        learnerObjectId,
        walletUsed,
        WalletTxnSource.ORDER,
        order._id,
        `wallet-${order._id}`,
      );
    }
    

    return order;
  }





  // =========================================
  private amPmTo24(time: string): string {
    const clean = time.trim();
    const match = clean.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
    if (!match) throw new BadRequestException(`Invalid time format "${time}"`);
    let hour = Number(match[1]);
    const min = Number(match[2]);
    if (match[3] === undefined) {
      throw new BadRequestException(`Invalid time format "${time}"`);
    }
    const mod = match[3].toUpperCase();
    if (mod === 'PM' && hour !== 12) hour += 12;
    if (mod === 'AM' && hour === 12) hour = 0;
    return `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
  }

  private getSlotDuration(start: string, end: string): number {
    const normalize = (time: string) => {
      const t = time.trim().toUpperCase();

      if (/^\d{1,2}:\d{2}$/.test(t)) return t;

      const match = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);
      if (!match) throw new BadRequestException('Invalid time format');

      let hour = Number(match[1]);
      const minute = Number(match[2] ?? '00');
      const period = match[3];

      if (period === 'PM' && hour !== 12) hour += 12;
      if (period === 'AM' && hour === 12) hour = 0;

      return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    };

    const startParts = normalize(start).split(':').map(Number);
    const endParts = normalize(end).split(':').map(Number);

    if (startParts.length !== 2 || endParts.length !== 2) {
      throw new BadRequestException('Invalid time format');
    }

    const [sh, sm] = startParts;
    const [eh, em] = endParts;

    if ([sh, sm, eh, em].some(v => Number.isNaN(v))) {
      throw new BadRequestException('Invalid time format');
    }

    // ✅ Use non-null assertion
    return ((eh! * 60 + em!) - (sh! * 60 + sm!)) / 60;
  }





  private attachBookingId(
    instructor: InstructorProfileDocument,
    slot: {
      date: string;
      startTime: string;
      endTime: string;
      pickupAddress?: string;
      suburb?: string;
      state?: string;
    },
    orderId: Types.ObjectId,
  ) {
    const reqStart = this.toMinutes(slot.startTime);
    const reqEnd = this.toMinutes(slot.endTime);

    for (const week of instructor.availability.weeks) {
      const day = week.days.find(d => d.date === slot.date);
      if (!day) continue;

      // 1️⃣ Find a parent availability slot that CONTAINS requested slot
      const parentSlot = day.slots.find(s => {
        const dbStart = this.toMinutes(s.startTime);
        const dbEnd = this.toMinutes(s.endTime);

        return reqStart >= dbStart && reqEnd <= dbEnd;
      });

      if (!parentSlot) continue;

      // 2️⃣ Check overlap with already booked slots
      const hasConflict = day.slots.some(s => {
        if (!s.isBooked) return false;

        const bookedStart = this.toMinutes(s.startTime);
        const bookedEnd = this.toMinutes(s.endTime);

        return this.overlaps(reqStart, reqEnd, bookedStart, bookedEnd);
      });

      if (hasConflict) {
        throw new BadRequestException(
          `Requested slot overlaps with an existing booking on ${slot.date}`,
        );
      }

      // 3️⃣ Create a NEW booked slot inside availability
      day.slots.push({
        startTime: slot.startTime,
        endTime: slot.endTime,
        isBooked: true,
        bookingId: orderId,
        pickupAddress: slot.pickupAddress,
        suburb: slot.suburb,
        state: slot.state,
      } as any);

      return;
    }

    throw new BadRequestException(
      'Requested slot is outside instructor availability',
    );
  }


  private toMinutes = (time: string): number => {
    const [h, m] = time.split(':').map(Number);
    if (h === undefined || m === undefined || isNaN(h) || isNaN(m)) {
      throw new BadRequestException(`Invalid time format: ${time}`);
    }
    return h * 60 + m;
  }

  private overlaps(
    aStart: number,
    aEnd: number,
    bStart: number,
    bEnd: number,
  ): boolean {
    return Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
  }

  private isSlotAvailable(
    instructor: InstructorProfileDocument,
    slot: { date: string; startTime: string; endTime: string },
  ): boolean {
    for (const week of instructor.availability.weeks) {
      const day = week.days.find(d => d.date === slot.date);
      if (!day) continue;

      for (const s of day.slots) {
        if (s.isBooked) continue;

        if (
          slot.startTime >= s.startTime &&
          slot.endTime <= s.endTime
        ) {
          return true;
        }
      }
    }
    return false;
  }
  private validateSlotAvailability(
    instructor: InstructorProfileDocument,
    slot: {
      date: string;
      startTime: string; // 24h format
      endTime: string;   // 24h format
      type: 'LESSON' | 'TEST';
    },
  ) {
    const reqStart = this.toMinutes(slot.startTime);
    const reqEnd = this.toMinutes(slot.endTime);

    // 1️⃣ Find instructor availability for date
    for (const week of instructor.availability.weeks) {
      const day = week.days.find(d => d.date === slot.date);
      if (!day) continue;

      // 2️⃣ Check slot is INSIDE availability range
      const rangeMatched = day.slots.some(range => {
        const rangeStart = this.toMinutes(range.startTime);
        const rangeEnd = this.toMinutes(range.endTime);

        return reqStart >= rangeStart && reqEnd <= rangeEnd;
      });

      if (!rangeMatched) {
        throw new BadRequestException(
          `Slot ${slot.startTime}-${slot.endTime} is outside instructor availability`,
        );
      }

      // 3️⃣ Check overlap with existing bookings
      const overlapping = day.slots.some(range => {
        if (!range.isBooked) return false;

        const bookedStart = this.toMinutes(range.startTime);
        const bookedEnd = this.toMinutes(range.endTime);

        return reqStart < bookedEnd && reqEnd > bookedStart;
      });

      if (overlapping) {
        throw new BadRequestException(
          `Slot ${slot.startTime}-${slot.endTime} is already booked`,
        );
      }

      return; // ✅ Slot valid
    }

    throw new BadRequestException(
      `Instructor not available on ${slot.date}`,
    );
  }

  private validateSlotDuration(
    start: string,
    end: string,
    type: 'LESSON' | 'TEST',
  ) {
    const duration =
      (this.toMinutes(end) - this.toMinutes(start)) / 60;

    if (type === 'TEST' && duration !== 2.5) {
      throw new BadRequestException(
        'Test booking must be exactly 2.5 hours',
      );
    }

    if (type === 'LESSON' && ![1, 2, 2.5].includes(duration)) {
      throw new BadRequestException(
        'Lesson slot must be 1, 2 or 2.5 hours',
      );
    }

    return duration;
  }


  private attachBookingByRange(
    instructor: InstructorProfileDocument,
    slot: NormalizedSlot,
    orderId: Types.ObjectId,
  ): void {
    const reqStart = this.toMinutes(slot.startTime);
    const reqEnd = this.toMinutes(slot.endTime);

    for (const week of instructor.availability.weeks) {
      const day = week.days.find(d => d.date === slot.date);
      if (!day) continue;

      // 1️⃣ Validate requested slot fits inside availability
      const insideAvailability = day.slots.some(s => {
        const sStart = this.toMinutes(s.startTime);
        const sEnd = this.toMinutes(s.endTime);
        return reqStart >= sStart && reqEnd <= sEnd;
      });

      if (!insideAvailability) {
        throw new BadRequestException(
          `Requested slot ${slot.startTime}-${slot.endTime} is outside availability`,
        );
      }

      // 2️⃣ Check overlap with booked slots
      const conflict = day.slots.some(s => {
        if (!s.isBooked) return false;

        const bStart = this.toMinutes(s.startTime);
        const bEnd = this.toMinutes(s.endTime);

        return reqStart < bEnd && reqEnd > bStart;
      });

      if (conflict) {
        throw new BadRequestException(
          `Requested slot overlaps an existing booking on ${slot.date}`,
        );
      }

      // 3️⃣ Insert booked slot
      day.slots.push({
        startTime: slot.startTime,
        endTime: slot.endTime,
        isBooked: true,
        bookingId: orderId,
        type: slot.type,
        pickupAddress: slot.pickupAddress,
        suburb: slot.suburb,
        state: slot.state,
      } as any);

      return;
    }

    throw new BadRequestException(
      `Instructor not available on ${slot.date}`,
    );
  }



}




