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
      await this.walletService.debitWallet(
        learnerId,
        usedHours * pricePerHour,
        WalletTxnSource.ORDER,
        order._id,
        `ORDER_WALLET_DEBIT_${order._id}`,
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
    for (const week of instructor.availability.weeks) {
      const day = week.days.find(d => d.date === slot.date);
      if (!day) continue;

      const matched = day.slots.find(
        s => s.startTime === slot.startTime && s.endTime === slot.endTime && !s.isBooked,
      );

      if (!matched) continue;

      matched.isBooked = true;
      matched.bookingId = orderId;
      matched.pickupAddress = slot.pickupAddress;
      matched.suburb = slot.suburb;
      matched.state = slot.state;

      return;
    }

    throw new BadRequestException('Slot not found in instructor availability');
  }
}




