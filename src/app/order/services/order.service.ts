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

import { CreateOrderDto } from '../dto/create-order.dto';
import { PLATFORM_CHARGE } from '@constant/packages';
import { WalletTxnSource } from '@common/db/schemas/wallet-transaction.schema';
import { Slot, SlotDocument } from '@common/db/schemas/slot.schema';

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
  ) {}

  async createOrder(learnerId: string, dto: CreateOrderDto) {
    const walletUsed = dto.walletUsed ?? 0; // ✅ DEFINE IT

    // 1️⃣ Fetch instructor
    const instructor = await this.instructorProfileModel.findOne({
      userId: new Types.ObjectId(dto.instructorId),
    });

    if (!instructor) throw new NotFoundException('Instructor not found');

    // 2️⃣ Determine vehicle & price
    const vehicle = instructor.vehicles?.[dto.vehicleType];
    if (!vehicle?.hasVehicle || typeof vehicle.pricePerHour !== 'number') {
      throw new BadRequestException(
        `Selected vehicle not available or price not configured`,
      );
    }

    const pricePerHour: number = vehicle.pricePerHour;

    // 3️⃣ Normalize slots
    const normalizedSlots: {
      date: string;
      startTime: string;
      endTime: string;
      pickupAddress?: string;
      suburb?: string;
      state?: string;
    }[] = (dto.slots || []).map(slot => {
      const startTime = this.amPmTo24(slot.startTime);
      const endTime = this.amPmTo24(slot.endTime);

      // slot duration validation
      const durationHours = this.getSlotDuration(startTime, endTime);
      if (![1, 2, 2.5].includes(durationHours)) {
        throw new BadRequestException(
          'Only 1, 2 or 2.5 hour bookings are allowed per slot',
        );
      }

      return {
        date: slot.date,
        startTime,
        endTime,
        pickupAddress: slot.pickupAddress || 'N/A',
        suburb: slot.suburb || 'N/A',
        state: slot.state || 'N/A',
      };
    });

    // 4️⃣ Validate gaps & overlap
    normalizedSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));
    for (let i = 1; i < normalizedSlots.length; i++) {
      const prev = normalizedSlots[i - 1];
      const curr = normalizedSlots[i];
    if (!curr || !prev) {
        throw new BadRequestException('Invalid slot data');
    }

      if (curr.startTime < prev.endTime) {
        throw new BadRequestException(`Slots are overlapping on ${curr.date}`);
      }

      const prevEndMin =
        Number(prev.endTime.split(':')[0]) * 60 +
        Number(prev.endTime.split(':')[1]);
      const currStartMin =
        Number(curr.startTime.split(':')[0]) * 60 +
        Number(curr.startTime.split(':')[1]);
      if (currStartMin - prevEndMin < 30) {
        throw new BadRequestException(
          `Minimum 30 minutes gap required between slots on ${curr.date}`,
        );
      }
    }

    // 5️⃣ Calculate used hours
    const usedHours = normalizedSlots.length
      ? normalizedSlots.reduce(
          (sum, s) => sum + this.getSlotDuration(s.startTime, s.endTime),
          0,
        )
      : 0;

    if (usedHours > dto.totalHours) {
      throw new BadRequestException(
        'Slot hours cannot exceed total booked hours',
      );
    }

    // 6️⃣ Calculate total amount
    let totalAmount = dto.totalHours * pricePerHour;

    // discount
    if (dto.totalHours >= 5 && dto.totalHours < 10) totalAmount *= 0.9;
    if (dto.totalHours >= 10) totalAmount *= 0.85;

    if (dto.couponValue) totalAmount -= dto.couponValue;

    const finalAmount = totalAmount + 10; // platform charge = 10

    const remainingHours = dto.totalHours - usedHours;
    const bookingMode = normalizedSlots.length ? 'WITH_SLOTS' : 'WITHOUT_SLOTS';

    const scheduleStatus = !normalizedSlots.length
      ? 'UNSCHEDULED'
      : remainingHours === 0
      ? 'FULLY_SCHEDULED'
      : 'PARTIALLY_SCHEDULED';

    const orderStatus = finalAmount === 0 ? 'CONFIRMED' : 'PENDING_PAYMENT';
    const paymentStatus = finalAmount === 0 ? 'NOT_REQUIRED' : 'PENDING';

    // 7️⃣ Create order
    const order = await this.orderModel.create({
      learnerId,
      vehicleType: dto.vehicleType,
      instructorId: dto.instructorId,
      pricePerHour,
      totalHours: dto.totalHours,
      usedHours,
      remainingHours,
      totalAmount: finalAmount,
      walletUsed: 0,
      walletCredit: 0,
      bookingMode,
      scheduleStatus,
      status: orderStatus,
      paymentStatus,
      bookedSlots: normalizedSlots.map(slot => ({
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        pickupLocation: {
          pickupAddress: slot.pickupAddress,
          suburb: slot.suburb,
          state: slot.state,
        },
      })),
      platformCharge: 10,
      discount: dto.couponValue || 0,
      coupons: dto.couponCode || '',
    });

    // 8️⃣ Attach slots to instructor availability
    for (const slot of normalizedSlots) {
      this.attachBookingId(instructor, slot, order._id);
    }
    if (normalizedSlots.length) await instructor.save();

    // 9️⃣ Wallet debit
    if (usedHours * pricePerHour > 0) {
      // await this.walletService.debitWallet(
      //   learnerId,
      //   usedHours * pricePerHour,
      //   WalletTxnSource.ORDER,
      //   order._id,
      //   `ORDER_WALLET_DEBIT_${order._id}`,
      // );
      if (walletUsed && walletUsed > 0) {
        await this.walletService.debitWallet(
          learnerId,
          walletUsed,
          WalletTxnSource.ORDER,
          order._id,
          `wallet-debit-${order._id}`,
        );
      }
      
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
    if(match[3] === undefined) {
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
  

  private toMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    if (
      h === undefined ||
      m === undefined ||
      Number.isNaN(h) ||
      Number.isNaN(m)
    ) {
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
  
}




