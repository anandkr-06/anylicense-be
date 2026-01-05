import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel, Virtual } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { UserDbService } from '@common/db/services/user.db.service';

import { Order, OrderDocument } from '@common/db/schemas/order.schema';
import {
  Learner,
  LearnerDocument,
} from '@common/db/schemas/learner.schema';
import {
  InstructorProfile,
  InstructorProfileDocument,
} from '@common/db/schemas/instructor-profile.schema';

import { CreateOrderDto } from '../dto/create-order.dto';
import { Logger } from 'nestjs-pino';
import { PLATFORM_CHARGE } from '@constant/packages';


@Injectable()
export class OrderService {
  constructor(
    private readonly userDbService: UserDbService,

    @InjectModel(InstructorProfile.name)
    private readonly instructorProfileModel: Model<InstructorProfileDocument>,

    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,

    @InjectModel(Learner.name)
    private readonly learnerModel: Model<LearnerDocument>,
    private readonly logger: Logger,
  ) { }

  // =====================================================
  // CREATE ORDER
  // =====================================================
  async createOrder(learnerId: string, dto: CreateOrderDto) {
    const instructor = await this.instructorProfileModel.findOne(
      { userId: new Types.ObjectId(dto.instructorId) }
    );

    if (!instructor) {
      throw new NotFoundException('Instructor not found');
    }

    const totalAmount = dto.totalAmount;
    const hasSlots = Array.isArray(dto.slots) && dto.slots.length > 0;


    let usedHours = 0;
    let usedAmount = 0;

    // =====================================================
    // SLOT VALIDATION & PRICE CALCULATION
    // =====================================================
    if (hasSlots) {
      const slots = dto.slots!; // ✅ safe because hasSlots is true

      usedHours = this.calculateSlotHours(slots);

      if (usedHours > dto.totalHours) {
        throw new BadRequestException(
          'Slot hours cannot exceed total booked hours',
        );
      }

      const vehicle = instructor.vehicles?.[dto.vehicleType];
      this.logger.log(`Vehicle details: ${JSON.stringify(vehicle)}`);


      if (!vehicle || !vehicle.hasVehicle) {
        throw new BadRequestException(`${JSON.stringify(vehicle)}'Selected vehicle not available'`);
      }

      if (typeof vehicle.pricePerHour !== 'number') {
        throw new BadRequestException(
          `Hourly price not configured for ${dto.vehicleType} vehicle`,
        );
      }

      usedAmount = usedHours * vehicle.pricePerHour;


      // if (usedAmount > totalAmount) {
      //   throw new BadRequestException(
      //     'Slot amount exceeds total order amount',
      //   );
      // }
    }


    // =====================================================
    // WALLET & SCHEDULE STATUS
    // =====================================================
    const orderPricePerHour = totalAmount / dto.totalHours;
    const walletCredit = totalAmount - usedAmount;
    const remainingHours = dto.totalHours - usedHours;

    const bookingMode = hasSlots ? 'WITH_SLOTS' : 'WITHOUT_SLOTS';

    const scheduleStatus = !hasSlots
      ? 'UNSCHEDULED'
      : remainingHours === 0
        ? 'FULLY_SCHEDULED'
        : 'PARTIALLY_SCHEDULED';

        let orderStatus = 'PENDING';
        let paymentStatus: 'NOT_REQUIRED' | 'PENDING' = 'PENDING';

        if (totalAmount === 0) {
          orderStatus = 'CONFIRMED';
          paymentStatus = 'NOT_REQUIRED';
        } else {
          orderStatus = 'PENDING_PAYMENT';
          paymentStatus = 'PENDING';
        }

        // 💰 PRICE CALCULATION
    
    
    let discountedAmount = totalAmount;
    if (dto.totalHours >= 5 && dto.totalHours < 10) {
      discountedAmount = totalAmount * 0.9;
    } else if (dto.totalHours >= 10) {
      discountedAmount = totalAmount * 0.85;
    }
    
    if(dto && dto.couponValue! > 0){
      discountedAmount = discountedAmount - dto.couponValue!;
    }
    const finalAmount = discountedAmount + PLATFORM_CHARGE;
    // =====================================================
    // CREATE ORDER
    // =====================================================
    const order = await this.orderModel.create({
      learnerId,
      instructorId: dto.instructorId,
      platformCharge: PLATFORM_CHARGE,
      discount: totalAmount - discountedAmount,
      coupons: dto.couponCode || '',
      couponValue: dto.couponValue || 0,
      vehicleType: dto.vehicleType,
      pricePerHour: orderPricePerHour,
      totalHours: dto.totalHours,
      usedHours,
      remainingHours,

      totalAmount:finalAmount,
      walletUsed: usedAmount,
      walletCredit,

      bookingMode,
      scheduleStatus,

      paymentStatus: paymentStatus,
      status: orderStatus,

      bookedSlots:
        dto.slots?.map(slot => ({
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          pickupLocation: {
            pickupAddress: slot.pickupAddress,
            suburb: slot.suburb,
            state: slot.state,
          },
        })) ?? [],
    });

    // =====================================================
    // BOOK SLOTS IN INSTRUCTOR AVAILABILITY
    // =====================================================
    for (const slot of dto.slots ?? []) {
      this.attachBookingId(instructor, slot, order._id);
    }

    if (dto.slots?.length) {
      await instructor.save();
    }


    // =====================================================
    // CREDIT WALLET IF NEEDED
    // =====================================================
    if (walletCredit > 0) {
      await this.learnerModel.findByIdAndUpdate(learnerId, {
        $inc: { walletBalance: walletCredit },
      });
    }

    return order;
  }

  // =====================================================
  // SLOT HOURS CALCULATION
  // =====================================================
  private calculateSlotHours(
    slots: { startTime: string; endTime: string }[],
  ): number {
    let totalMinutes = 0;

    for (const slot of slots) {
      const [sh, sm] = slot.startTime.split(':');
      const [eh, em] = slot.endTime.split(':');

      if (
        sh === undefined ||
        sm === undefined ||
        eh === undefined ||
        em === undefined
      ) {
        throw new BadRequestException('Invalid time format, expected HH:mm');
      }

      const startHour = Number(sh);
      const startMinute = Number(sm);
      const endHour = Number(eh);
      const endMinute = Number(em);

      if (
        Number.isNaN(startHour) ||
        Number.isNaN(startMinute) ||
        Number.isNaN(endHour) ||
        Number.isNaN(endMinute)
      ) {
        throw new BadRequestException('Invalid numeric time value');
      }

      const start = startHour * 60 + startMinute;
      const end = endHour * 60 + endMinute;

      if (end <= start) {
        throw new BadRequestException('Invalid slot time range');
      }

      totalMinutes += end - start;
    }

    return totalMinutes / 60;
  }


  // =====================================================
  // ATTACH BOOKING TO AVAILABILITY SLOT
  // =====================================================
  private attachBookingId(
    instructor: InstructorProfileDocument,
    slot: {
      date: string;
      startTime: string;
      endTime: string;
      pickupAddress: string;
    },
    orderId: Types.ObjectId,
  ) {
    for (const week of instructor.availability.weeks) {
      const day = week.days.find(d => d.date === slot.date);
      if (!day) continue;

      const matchedSlot = day.slots.find(
        s =>
          s.startTime === slot.startTime &&
          s.endTime === slot.endTime &&
          !s.isBooked,
      );

      if (!matchedSlot) {
        throw new BadRequestException(
          `Slot ${slot.startTime}-${slot.endTime} already booked or unavailable`,
        );
      }

      matchedSlot.isBooked = true;
      matchedSlot.bookingId = orderId;

      // 🔥 SAVE PICKUP LOCATION PER SLOT
      matchedSlot.pickupAddress = slot.pickupAddress;

      return;
    }

    throw new BadRequestException('Slot not found in instructor availability');
  }

  // =====================================================
  // USER FETCH (FUTURE USE)
  // =====================================================
  private async getUser(userPublicId: string) {
    return this.userDbService.findByPublicId(userPublicId);
  }
}
