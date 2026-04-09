import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
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
import { WalletTransaction, WalletTxnSource } from '@common/db/schemas/wallet-transaction.schema';
import { Slot, SlotDocument } from '@common/db/schemas/slot.schema';
import { RescheduleRequestDto } from '../dto/reschedule-request.dto';

import { ActionMetaRequestDto } from '../dto/action-meta.dto';
import { FeedbackOwnerType, OrderStatus } from '@constant/enum';
import { calculateSlotDurationInHours, normalizeTime } from '@constant/order-actions';
import { CreatePrivateOrderDto } from '../dto/create-private-order.dto';
import { PrivateLearnerService } from '../services/private-order.service';

import { PrivateOrder, PrivateOrderDocument } from '@common/db/schemas/private-order.schema';
import Stripe from 'stripe';
import { OrderStatusType, PrivateOrderDetailsResponseDto } from '../dto/private-order-details.response';
import { PrivateOrderPopulated } from '@interfaces/order.interface';
import { NormalizedSlot } from '@common/types/express';
import { InstructorTransaction, InstructorTransactionDocument } from '@common/db/schemas/instructor-transactions.schema';
import { InstructorService } from './instructorService';
import { SlotService } from './slotService';
import { PricingService } from './pricingService';
import { PaymentService } from './paymentService';
import { PayoutService } from '@app/payouts/payout.service';
import { NotificationService } from 'modules/notifications/notification.service';
import { PopulatedOrder } from '@constant/helper';
import { Cron } from '@nestjs/schedule';
import { User, UserDocument } from '@common/db/schemas/user.schema';

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

type BookedSlot = {
  _id: any;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  type?: 'LESSON' | 'TEST';
  reschedule?: any;
};

type PrivateSlot = {
  date: string;
  startTime: string;
  endTime: string;
};


@Injectable()
export class OrderService {
  private stripe = new Stripe(process.env['STRIPE_SECRET_KEY']!, {
    //apiVersion: '2024-06-20',
    apiVersion: '2025-12-15.clover',
  });
  constructor(
    private readonly userDbService: UserDbService,
    private readonly walletService: WalletService,
    private readonly payoutService: PayoutService,

    private readonly instructorService: InstructorService,
    private readonly slotService: SlotService,
    private readonly pricingService: PricingService,
    private readonly paymentService: PaymentService,

    private readonly notificationService: NotificationService,


    private readonly privateLearnerService: PrivateLearnerService,

    @InjectModel(InstructorProfile.name)
    private readonly instructorProfileModel: Model<InstructorProfileDocument>,

    @InjectModel(Slot.name)
    private readonly slotModel: Model<SlotDocument>,

    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    

    @InjectModel(Learner.name)
    private readonly learnerModel: Model<LearnerDocument>,

    private readonly logger: Logger,
    @InjectModel(PrivateOrder.name)
    private readonly privateOrderModel: Model<PrivateOrderDocument>,

    @InjectModel(InstructorTransaction.name)
    private readonly instructorTransactionModel: Model<InstructorTransactionDocument>,
    @InjectModel(WalletTransaction.name)
    @InjectModel(WalletTransaction.name) private walletModel: Model<WalletTransaction>,

  ) { }



  // 🔐 Centralized pricing logic
  // async createPrivateOrder(
  //   instructorId: string,
  //   dto: CreatePrivateOrderDto,
  // ) {
  //   let learner;

  //   // 1️⃣ Resolve learner
  //   if (dto.privateLearnerId) {
  //     learner = await this.privateLearnerService.findOne(
  //       instructorId,
  //       dto.privateLearnerId,
  //     );

  //     if (!learner) {
  //       throw new BadRequestException('Private learner not found');
  //     }
  //   } else {
  //     if (!dto.newLearner) {
  //       throw new BadRequestException('New learner details required');
  //     }

  //     learner = await this.privateLearnerService.create(instructorId, {
  //       firstName: dto.newLearner.firstName,
  //       lastName: dto.newLearner.lastName,
  //       mobileNumber: dto.newLearner.mobileNumber,
  //       email: dto.newLearner.email,
  //       pickupAddress: dto.newLearner.pickupAddress,
  //       suburb: dto.newLearner.suburb,
  //       state: dto.newLearner.state,
  //       preferredVehicleType: dto.newLearner.vehicleType,
  //     });
  //   }

  //   // 2️⃣ Load instructor profile ONCE
  //   const instructorProfile = await this.instructorProfileModel
  //     .findOne({ userId: new Types.ObjectId(instructorId) })
  //     .select({ vehicles: 1 })
  //     .lean();

  //   if (!instructorProfile) {
  //     throw new BadRequestException('Instructor profile not found');
  //   }

  //   // 3️⃣ Lesson slots pricing
  //   const lessonSlots = dto.lessonSlots.map(slot => {
  //     const hourlyPrice = this.resolvePrivatePrice(
  //       instructorProfile,
  //       learner.preferredVehicleType,
  //       false,
  //     );

  //     return {
  //       ...slot,
  //       price: hourlyPrice * slot.bookingPeriod,
  //     };
  //   });

  //   // 4️⃣ Test package pricing
  //   let testPackage;
  //   if (dto.testPackage) {
  //     const testPrice = this.resolvePrivatePrice(
  //       instructorProfile,
  //       learner.preferredVehicleType,
  //       true,
  //     );

  //     testPackage = {
  //       ...dto.testPackage,
  //       price: testPrice,
  //     };
  //   }

  //   // 5️⃣ Total
  //   const totalAmount =
  //     lessonSlots.reduce((sum, s) => sum + s.price, 0) +
  //     (testPackage?.price || 0);

  //   // 6️⃣ Create private order
  //   const orderData = await this.privateOrderModel.create({
  //     instructorId: new Types.ObjectId(instructorId),
  //     privateLearnerId: learner._id,
  //     vehicleType: learner.preferredVehicleType,
  //     lessonSlots,
  //     testPackage,
  //     totalAmount,
  //   });

  //   if (!orderData?._id) {
  //     throw new BadRequestException('Failed to create private order');
  //   }

  //   return orderData;

  // }

  async createPrivateOrder(
    instructorId: string,
    dto: CreatePrivateOrderDto,
  ) {
    let learner;
  
    /* =====================================================
       1️⃣ Resolve learner
    ===================================================== */
    if (dto.privateLearnerId) {
      learner = await this.privateLearnerService.findOne(
        instructorId,
        dto.privateLearnerId,
      );
  
      if (!learner) {
        throw new BadRequestException('Private learner not found');
      }
    } else {
      if (!dto.newLearner) {
        throw new BadRequestException('New learner details required');
      }
  
      learner = await this.privateLearnerService.create(instructorId, {
        firstName: dto.newLearner.firstName,
        lastName: dto.newLearner.lastName,
        mobileNumber: dto.newLearner.mobileNumber,
        email: dto.newLearner.email,
        pickupAddress: dto.newLearner.pickupAddress,
        suburb: dto.newLearner.suburb,
        state: dto.newLearner.state,
        preferredVehicleType: dto.newLearner.vehicleType,
      });
    }
  
    /* =====================================================
       2️⃣ Load instructor profile
    ===================================================== */
    const instructorProfile = await this.instructorProfileModel.findOne({
      userId: new Types.ObjectId(instructorId),
    });
  
    if (!instructorProfile) {
      throw new BadRequestException('Instructor profile not found');
    }
  
    /* =====================================================
       3️⃣ Helper: normalize time
    ===================================================== */
    const toMinutes = (time: string): number => {
      if (!time) {
        throw new BadRequestException('Invalid time');
      }
  
      time = time.trim();
  
      // 24-hour format: 09:00
      if (!time.includes('AM') && !time.includes('PM')) {
        const [hours=0, minutes=0] = time.split(':').map(Number);
  
        if (isNaN(hours) || isNaN(minutes)) {
          throw new BadRequestException(`Invalid time format: ${time}`);
        }
  
        return hours * 60 + minutes;
      }
  
      // 12-hour format: 09:00 AM
      const [timePart, modifier] = time.split(' ');
  
      if (!timePart || !modifier) {
        throw new BadRequestException(`Invalid time format: ${time}`);
      }
  
      let [hours=0, minutes=0] = timePart.split(':').map(Number);
  
      if (isNaN(hours) || isNaN(minutes)) {
        throw new BadRequestException(`Invalid time format: ${time}`);
      }
  
      if (modifier === 'PM' && hours !== 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;
  
      return hours * 60 + minutes;
    };
  
    const normalizeTime = (time: string): string => {
      const mins = toMinutes(time);
  
      const h = Math.floor(mins / 60)
        .toString()
        .padStart(2, '0');
  
      const m = (mins % 60).toString().padStart(2, '0');
  
      return `${h}:${m}`;
    };
  
    /* =====================================================
       4️⃣ Prepare lesson slots + pricing
    ===================================================== */
    const lessonSlots = dto.lessonSlots.map(slot => {
      const hourlyPrice = this.resolvePrivatePrice(
        instructorProfile,
        learner.preferredVehicleType,
        false,
      );
  
      return {
        ...slot,
        startTime: normalizeTime(slot.startTime),
        endTime: normalizeTime(slot.endTime),
        price: hourlyPrice * slot.bookingPeriod,
      };
    });
  
    const slotsToBook: NormalizedSlot[] = lessonSlots.map(slot => ({
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      type: 'LESSON',
    }));
  
    /* =====================================================
       5️⃣ Validate slot conflicts
    ===================================================== */
    for (const slot of slotsToBook) {
      await this.validateSlotConflict(instructorProfile._id, slot);
    }
  
    /* =====================================================
       6️⃣ Test package pricing
    ===================================================== */
    let testPackage;
  
    if (dto.testPackage) {
      const testPrice = this.resolvePrivatePrice(
        instructorProfile,
        learner.preferredVehicleType,
        true,
      );
  
      testPackage = {
        ...dto.testPackage,
        startTime: normalizeTime(dto.testPackage.startTime),
        endTime: normalizeTime(dto.testPackage.endTime),
        price: testPrice,
      };
    }
  
    /* =====================================================
       7️⃣ Total amount
    ===================================================== */
    const totalAmount =
      lessonSlots.reduce((sum, s) => sum + s.price, 0) +
      (testPackage?.price || 0);
  
    /* =====================================================
       8️⃣ Create private order first
    ===================================================== */
    const orderData = await this.privateOrderModel.create({
      instructorId: new Types.ObjectId(instructorId),
      privateLearnerId: learner._id,
      vehicleType: learner.preferredVehicleType,
      lessonSlots,
      testPackage,
      totalAmount,
      status: 'PENDING',
    });
  
    if (!orderData?._id) {
      throw new BadRequestException('Failed to create private order');
    }
  
    /* =====================================================
       9️⃣ Attach booking to instructor availability
           SAME FLOW AS createOrder
    ===================================================== */
    try {
      // sort slots before applying
      const sortedSlots = [...slotsToBook].sort((a, b) => {
        return toMinutes(a.startTime) - toMinutes(b.startTime);
      });
  
      for (const slot of sortedSlots) {
        await this.validateSlotConflict(instructorProfile._id, slot);
  
        this.attachBookingByRange(
          instructorProfile,
          {
            date: slot.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            type: slot.type,
          },
          orderData._id,
        );
      }
  
      // save instructor profile once
      await instructorProfile.save();
  
      /* =====================================================
         🔟 Confirm order
      ===================================================== */
      await this.privateOrderModel.updateOne(
        { _id: orderData._id },
        { status: 'CONFIRMED' },
      );
  
      return orderData;
    } catch (error) {
      /* =====================================================
         ❗ rollback order if slot booking fails
      ===================================================== */
      await this.privateOrderModel.deleteOne({
        _id: orderData._id,
      });
  
      throw error;
    }
  }

  private resolvePrivatePrice(
    instructorProfile: InstructorProfile,
    vehicleType: 'AUTO' | 'MANUAL',
    isTest = false,
  ): number {
    const privateVehicle = instructorProfile.vehicles?.private;

    if (!privateVehicle?.hasVehicle) {
      throw new BadRequestException(
        'Private booking not enabled for instructor',
      );
    }

    const vehicleKey: 'auto' | 'manual' =
      vehicleType === 'AUTO' ? 'auto' : 'manual';

    const priceBlock = privateVehicle[vehicleKey];

    if (!priceBlock) {
      throw new BadRequestException(
        `Private price not configured for ${vehicleType}`,
      );
    }

    const price = isTest
      ? priceBlock.testPricePerHour
      : priceBlock.pricePerHour;

    if (!price) {
      throw new BadRequestException('Invalid private pricing');
    }

    return price;
  }


  async getInstructorPrivateOrders({
    instructorId,
    page,
    limit,
    status,
  }: {
    instructorId: string;
    page: number;
    limit: number;
    status?: string;
  }) {
    const query: any = {
      instructorId: new Types.ObjectId(instructorId),
    };
    query.paymentStatus = 'PAID';
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.privateOrderModel
        .find(query)
        .populate({
          path: 'privateLearnerId',
          select: 'firstName lastName mobileNumber preferredVehicleType',
        }) // ✅ ONLY learner
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      this.privateOrderModel.countDocuments(query),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getInstructorPrivateOrderDetails(
    instructorId: string,
    orderId: string,
  ): Promise<PrivateOrderDetailsResponseDto> {
    const order = await this.privateOrderModel
      .findOne({
        _id: new Types.ObjectId(orderId),
        instructorId: new Types.ObjectId(instructorId),
        isDeleted: { $ne: true },
      })
      .populate({
        path: 'privateLearnerId',
        select: 'firstName mobileNumber preferredVehicleType',
      })
      .lean<PrivateOrderPopulated>();

    if (!order) {
      throw new NotFoundException('Private order not found');
    }


    return {
      id: order._id.toString(),
      status: this.mapOrderStatus(order.status),
      paymentStatus: order.paymentStatus,
      vehicleType: order.vehicleType,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,

      privateLearner: {
        firstName: order.privateLearnerId.firstName,
        mobileNumber: order.privateLearnerId.mobileNumber,
        preferredVehicleType:
          order.privateLearnerId.preferredVehicleType,
      },

      lessonSlots: order.lessonSlots,
      testPackage: order.testPackage ?? null,
    };


  }

  private mapOrderStatus(status: string): OrderStatusType {
    switch (status) {
      case 'PENDING_PAYMENT':
      case 'CONFIRMED':
      case 'CANCELLED':
      case 'REFUNDED':
        return status;
      default:
        throw new Error(`Invalid order status: ${status}`);
    }
  }

  async cancelPrivateOrder(
    instructorId: string,
    orderId: string,
  ) {
    const order = await this.privateOrderModel.findOne({
      _id: new Types.ObjectId(orderId),
      instructorId: new Types.ObjectId(instructorId),
    });

    if (!order) {
      throw new NotFoundException('Private order not found');
    }

    if (!['PENDING_PAYMENT', 'CONFIRMED'].includes(order.status)) {
      throw new BadRequestException(
        `Cannot cancel order with status ${order.status}`,
      );
    }

    // 1️⃣ Update order
    order.status = OrderStatus.CANCELLED;

    if (order.paymentStatus === 'PENDING') {
      order.paymentStatus = 'FAILED';
    }

    await order.save();

    // 2️⃣ Unlock slots (important)
    await this.unlockPrivateOrderSlots(order._id);

    return {
      message: 'Private order cancelled successfully',
      orderId: order._id.toString(),
      status: this.mapOrderStatus(order.status)
    };

  }

  private async unlockPrivateOrderSlots(orderId: Types.ObjectId) {
    await this.instructorProfileModel.updateMany(
      {
        'availability.weeks.days.slots.bookingId': orderId,
      },
      {
        $set: {
          'availability.weeks.$[].days.$[].slots.$[slot].isBooked': false,
          'availability.weeks.$[].days.$[].slots.$[slot].bookingId': null,
        },
      },
      {
        arrayFilters: [{ 'slot.bookingId': orderId }],
      },
    );
  }


  // ⏱ 24 HOUR RULE
  private isWithin24Hours(slotDate: string, startTime: string): boolean {
    const slotDateTime = new Date(`${slotDate}T${startTime}`);
    const diffMs = slotDateTime.getTime() - Date.now();
    return diffMs <= 24 * 60 * 60 * 1000;
  }

  private parseTimeToMinutes(time: string): number {

    const [hStr, mStr] = normalizeTime(time).split(':');

    const h = Number(hStr);
    const m = Number(mStr);

    if (Number.isNaN(h) || Number.isNaN(m)) {
      throw new BadRequestException("Invalid time format");
    }

    return h * 60 + m;
  }

  private calculateSlotHours(start: string, end: string): number {

    const startMinutes = this.parseTimeToMinutes(start);
    const endMinutes = this.parseTimeToMinutes(end);

    return (endMinutes - startMinutes) / 60;
  }



 

  async cancelSlot(
    orderId: string,
    slotId: string,
    userId: string,
    role: string, // ✅ use enum instead of string
  ) {
    const order = await this.orderModel.findById(orderId);
  
    if (!order) {
      throw new NotFoundException('Order not found');
    }
  
    const slot = order.bookedSlots.id(slotId);
  
    if (!slot) {
      throw new NotFoundException('Slot not found');
    }
    const instructorProfile = await this.instructorProfileModel
  .findById(order.instructorId)
  .select('userId')
  .lean();

const instructorUser = instructorProfile
  ? await this.userModel
      .findById(instructorProfile.userId)
      .select('email firstName lastName mobileNumber')
      .lean()
  : null;


    // ✅ Ownership check (SECURITY)
    if (
      (role === 'learner' && order.learnerId.toString() !== userId) ||
      (role === 'instructor' && instructorProfile?.userId.toString() !== userId)
    ) {
      throw new ForbiddenException('Unauthorized');
    }
  
    // ✅ Prevent double cancel
    if (slot.status === 'CANCELLED') {
      throw new BadRequestException('Slot already cancelled');
    }
  
    // ✅ Allowed states
    if (slot.status !== 'BOOKED' && slot.status !== 'RESCHEDULED') {
      throw new BadRequestException('Slot not cancellable');
    }
  
    // ✅ Calculate before mutation
    const within24h = this.isWithin24Hours(
      slot.date,
      slot.startTime,
    );
  
    let refund = 0;
  
    if (!within24h) {
      const hours = this.calculateSlotHours(
        slot.startTime,
        slot.endTime,
      );
  
      refund = hours * order.pricePerHour;
    }
  
    // ✅ Update slot status
    slot.status = 'CANCELLED';
  
    slot.notification = {
      learner: true,
      instructor: true,
    };
  
    slot.actionMeta = {
      actedBy: role,
      actedAt: new Date(),
      reasonType: within24h ? 'LATE_CANCEL' : 'EARLY_CANCEL',
    };
  
    await order.save();
  
    /**
     * ✅ Free instructor slot (non-destructive)
     */
    const result = await this.instructorProfileModel.updateOne(
      { _id: order.instructorId },
      {
        $set: {
          "availability.weeks.$[].days.$[day].slots.$[slot].isBooked": false,
          "availability.weeks.$[].days.$[day].slots.$[slot].isTempBlocked": false,
          "availability.weeks.$[].days.$[day].slots.$[slot].bookingId": null
        }
      },
      {
        arrayFilters: [
          { "day.date": slot.date },
          {
            "slot.startTime": normalizeTime(slot.startTime),
            "slot.endTime": normalizeTime(slot.endTime)
          }
        ]
      }
    );
  
    if (result.modifiedCount === 0) {
      console.error('Slot not freed properly', {
        instructorId: order.instructorId,
        slot,
      });
    }
  
    /**
     * ✅ Wallet refund
     */
const learner = await this.learnerModel.findById(order.learnerId);
// const instructorUser = await this.userModel.findById(order.instructorId);

    if (refund > 0) {
      
      if (!learner) {
        throw new NotFoundException('Learner not found');
      }
  
      learner.walletBalance += refund;
  
      await learner.save();
  
      await this.walletModel.create({
        learnerId: order.learnerId,
        userId: order.learnerId,
        role: 'learner', // ✅ FIXED
        type: 'CREDIT',
        description: 'SLOT CANCELLED',
        amount: refund,
        balanceAfter: learner.walletBalance,
        source: 'SLOT_CANCELLED',
        referenceEntityId: order._id
      });
    }
  
    /* ===============================
   🔔 SEND NOTIFICATIONS
================================= */

const notificationPayload = {
  actedBy: role,
  slotDate: slot.date,
  startTime: slot.startTime,
  endTime: slot.endTime,
  reasonType: slot.actionMeta.reasonType,
  comment: '',
};

// 👉 Wait for notifications properly
const results = await Promise.allSettled([
  // 👉 Learner
  learner?.email
    ? this.notificationService.sendSlotCancelledNotification({
        receiverEmail: learner.email,
        receiverName: learner.firstName,
        receiverPhone: learner.mobileNumber,
        ...notificationPayload,
      })
    : Promise.resolve(),

  // 👉 Instructor
  instructorUser?.email
    ? this.notificationService.sendSlotCancelledNotification({
        receiverEmail: instructorUser.email,
        receiverName: `${instructorUser.firstName} ${instructorUser.lastName}`,
        receiverPhone: instructorUser.mobileNumber,
        ...notificationPayload,
      })
    : Promise.resolve(),
]);
console.log('Notification Learner:', learner);
console.log('Notification Instructor:', instructorUser);
console.log('Notification Results:', results);

    return {
      success: true,
      message: 'Slot cancelled successfully'
    };
  }

  async noShowSlot(
    orderId: string,
    slotId: string,
    userId: string,
    role: 'LEARNER' | 'INSTRUCTOR',
    body: ActionMetaRequestDto,
  ) {
    const order: any = await this.orderModel
      .findById(orderId)
      .populate({
        path: 'instructorId',
        populate: {
          path: 'userId',
          select: 'firstName lastName email mobileNumber',
        },
      })
      .populate({
        path: 'learnerId',
        select: 'firstName lastName email mobileNumber',
      });

    if (!order) throw new NotFoundException('Order not found');

    const learner = order.learnerId;
    const instructorUser = order.instructorId?.userId;

    const slot = order.bookedSlots.id(slotId);
    if (!slot) throw new NotFoundException('Slot not found');

    if (slot.status !== 'BOOKED' && slot.status !== 'RESCHEDULED') {
      throw new BadRequestException(
        `Slot cannot be marked no-show from ${slot.status}`,
      );
    }

    /* ===============================
       ⏱️ CALCULATE HOURS
    =============================== */
    const start = normalizeTime(slot.startTime);
    const end = normalizeTime(slot.endTime);
    const hours = calculateSlotDurationInHours(start, end);

    /* ===============================
       ✅ UPDATE SLOT
    =============================== */
    slot.status = 'NOSHOW';

    slot.notification = {
      learner: true,
      instructor: true,
    };

    slot.actionMeta = {
      actedBy: role,
      reasonType: body.reasonType,
      comment: body.comment,
      attachment: body.attachmentUrl,
      actedAt: new Date(),
    };

    /* ===============================
       ✅ UPDATE ORDER (same as completed)
    =============================== */
    order.usedHours += hours;

    order.remainingHours = Math.max(
      0,
      order.totalHours - order.usedHours,
    );

    if (order.remainingHours === 0) {
      order.scheduleStatus = 'FULLY_SCHEDULED';
    }

    await order.save();

    /* ===============================
       ✅ INSTRUCTOR HOURS UPDATE
    =============================== */
    await this.instructorProfileModel.updateOne(
      { _id: new Types.ObjectId(order.instructorId._id) },
      { $inc: { totalHours: hours } },
    );

    /* ===============================
       💰 EARNINGS CALCULATION
    =============================== */
    let grossAmount = 0;
    let pricePerHour = 0;

    if (slot.type === 'LESSON') {
      grossAmount = hours * order.pricePerHour;
      pricePerHour = order.pricePerHour;
    }

    if (slot.type === 'TEST') {
      grossAmount = order.testPrice;
      pricePerHour = order.testPrice;
    }

    const platformCommission = grossAmount * 0.17;
    const instructorEarning = grossAmount - platformCommission;

    /* ===============================
       💳 CREATE TRANSACTION (same as completed)
    =============================== */
    const txn = await this.instructorTransactionModel.create({
      orderId: order._id,
      slotId: slot._id,
      learnerId: order.learnerId._id,
      instructorId: order.instructorId._id,
      type: slot.type,
      hours,
      pricePerHour,
      grossAmount,
      platformCommission,
      instructorEarning,
    });

    /* ===============================
       💰 CREDIT WALLET
    =============================== */
    await this.payoutService.creditInstructorWallet(txn._id, 'NOSHOW');

    /* ===============================
       🔔 SEND NOTIFICATIONS
    =============================== */

    // 👉 Learner
    if (learner?.email) {
      try {
        await this.notificationService.sendNoShowNotification({
          receiverEmail: learner.email,
          receiverName: learner.firstName,
          receiverPhone: learner.mobileNumber,
          actedBy: role,
          slotDate: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          reasonType: body.reasonType,
          comment: body.comment,
        });
      } catch (error) {
        console.error('Learner email failed:', error);
      }
    }

    // 👉 Instructor
    if (instructorUser?.email) {
      try {
        await this.notificationService.sendNoShowNotification({
          receiverEmail: instructorUser.email,
          receiverName: `${instructorUser.firstName} ${instructorUser.lastName}`,
          receiverPhone: instructorUser.mobileNumber,
          actedBy: role,
          slotDate: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          reasonType: body.reasonType,
          comment: body.comment,
          // instructorEarning, // ✅ optional (good for transparency)
        });
      } catch (error) {
        console.error('Instructor email failed:', error);
      }
    }

    return {
      success: true,
      message: 'Slot marked as no-show',
    };
  }

  async completeSlot(
    orderId: string,
    slotId: string,
    userId: string,
  ) {
    const order: any = await this.orderModel
      .findById(orderId)
      .populate({
        path: 'instructorId',
        populate: {
          path: 'userId',
          select: 'firstName lastName email mobileNumber',
        },
      })
      .populate({
        path: 'learnerId',
        select: 'firstName lastName email mobileNumber',
      });

    if (!order) throw new NotFoundException('Order not found');

    const learner = order.learnerId;
    const instructorUser = order.instructorId?.userId;

    const slot = order.bookedSlots.find(
      (s: any) => String(s._id) === slotId,
    );

    if (!slot) throw new NotFoundException('Slot not found');

    if (slot.status !== 'BOOKED' && slot.status !== 'RESCHEDULED') {
      throw new BadRequestException(
        `Slot cannot be completed from ${slot.status}`,
      );
    }

    const start = normalizeTime(slot.startTime);
    const end = normalizeTime(slot.endTime);

    const hours = calculateSlotDurationInHours(start, end);

    /* ✅ Update slot */
    slot.status = 'COMPLETED';
    slot.notification = {
      learner: true,
      instructor: true,
    };

    /* ✅ Update order */
    order.usedHours += hours;

    order.remainingHours = Math.max(
      0,
      order.totalHours - order.usedHours,
    );

    if (order.remainingHours === 0) {
      order.scheduleStatus = 'FULLY_SCHEDULED';
    }

    await order.save();

    /* ✅ Instructor hours */
    await this.instructorProfileModel.updateOne(
      { _id: new Types.ObjectId(order.instructorId._id) },
      { $inc: { totalHours: hours } },
    );

    /* 💰 Earnings calculation */
    let grossAmount = 0;
    let pricePerHour = 0;

    if (slot.type === 'LESSON') {
      grossAmount = hours * order.pricePerHour;
      pricePerHour = order.pricePerHour;
    }

    if (slot.type === 'TEST') {
      grossAmount = order.testPrice;
      pricePerHour = order.testPrice;
    }

    const platformCommission = grossAmount * 0.17;
    const instructorEarning = grossAmount - platformCommission;

    const txn = await this.instructorTransactionModel.create({
      orderId: order._id,
      slotId: slot._id,
      learnerId: order.learnerId._id,
      instructorId: order.instructorId._id,
      type: slot.type,
      hours,
      pricePerHour,
      grossAmount,
      platformCommission,
      instructorEarning,
    });

    await this.payoutService.creditInstructorWallet(txn._id, 'LESSON_COMPLETED');

    /* ===============================
       🔔 SEND NOTIFICATIONS
    =============================== */

    // 👉 Learner
    if (learner?.email) {
      try {
        await this.notificationService.sendSlotCompletedNotification({
          receiverEmail: learner.email,
          receiverName: learner.firstName,
          receiverPhone: learner.mobileNumber,
          slotDate: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          type: slot.type,
          hours,
        });
      } catch (error) {
        console.error('Email failed:', error);
      }
    }

    // 👉 Instructor
    if (instructorUser?.email) {
      try {
        await this.notificationService.sendSlotCompletedNotification({
          receiverEmail: instructorUser.email,
          receiverName: `${instructorUser.firstName} ${instructorUser.lastName}`,
          receiverPhone: instructorUser.mobileNumber,
          slotDate: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          type: slot.type,
          hours,
          instructorEarning, // 💰 only for instructor
        });
      } catch (error) {
        console.error('Email failed:', error);
      }
    }

    return {
      success: true,
      message: 'Slot marked as completed',
      completedHours: hours,
    };
  }

  // async respondSlotReschedule(
  //   orderId: string,
  //   slotId: string,
  //   userId: string,
  //   action: 'ACCEPTED' | 'REJECTED',
  // ) {
  //   const order = await this.orderModel.findById(orderId);
  //   if (!order) throw new NotFoundException('Order not found');

  //   const instructorData = await this.instructorProfileModel.findOne(
  //     { userId: new Types.ObjectId(userId) }
  //   );
  //   if (!order) throw new NotFoundException('Order not found');

  //   const slot = order.bookedSlots.id(slotId);
  //   if (!slot || !slot.reschedule) {
  //     throw new NotFoundException('No reschedule request found');
  //   }

  //   const isLearner = order.learnerId.toString() === userId;
  //   const isInstructor = order.instructorId.toString() === instructorData?.id.toString();

  //   if (!isLearner && !isInstructor) {
  //     throw new ForbiddenException('Unauthorized');
  //   }

  //   if (
  //     (slot.reschedule.requestedBy === 'LEARNER' && isLearner) ||
  //     (slot.reschedule.requestedBy === 'INSTRUCTOR' && isInstructor)
  //   ) {
  //     this.logger.warn(`${JSON.stringify(slot.reschedule)} Learner to check: ${JSON.stringify(isLearner)}`)
  //     throw new ForbiddenException('Requester cannot respond');
  //   }

  //   slot.reschedule.status = action;
  //   slot.reschedule.respondedAt = new Date();

  //   if (action === 'ACCEPTED') {
  //     slot.date = slot.reschedule.proposedSlot.date;
  //     slot.startTime = slot.reschedule.proposedSlot.startTime;
  //     slot.endTime = slot.reschedule.proposedSlot.endTime;
  //     slot.status = 'RESCHEDULED';
  //   }

  //   if (action === 'REJECTED') {
  //     slot.status = 'BOOKED';
  //     slot.reschedule.status = 'REJECTED';
  //     slot.reschedule.respondedAt = new Date();
  //   }
  //   slot.notification = {
  //     learner: true,
  //     instructor: true,
  //   };
  //   slot.reschedule = undefined;

  //   await order.save();

  //   return {
  //     success: true,
  //     message: `Slot reschedule ${action.toLowerCase()}`,
  //   };
  // }

  // async respondSlotReschedule(
  //   orderId: string,
  //   slotId: string,
  //   userId: string,
  //   action: 'ACCEPTED' | 'REJECTED',
  // ) {
  //   const order = await this.orderModel.findById(orderId);
  //   if (!order) throw new NotFoundException('Order not found');

  //   const instructorData = await this.instructorProfileModel.findOne({
  //     userId: new Types.ObjectId(userId),
  //   });

  //   const slot = order.bookedSlots.id(slotId);
  //   if (!slot || !slot.reschedule) {
  //     throw new NotFoundException('No reschedule request found');
  //   }

  //   const isLearner = order.learnerId.toString() === userId;

  //   const isInstructor =
  //     instructorData &&
  //     order.instructorId.toString() === instructorData._id.toString();

  //   if (!isLearner && !isInstructor) {
  //     throw new ForbiddenException('Unauthorized');
  //   }

  //   if (
  //     (slot.reschedule.requestedBy === 'LEARNER' && isLearner) ||
  //     (slot.reschedule.requestedBy === 'INSTRUCTOR' && isInstructor)
  //   ) {
  //     throw new ForbiddenException('Requester cannot respond');
  //   }

  //   /* ✅ HANDLE ACCEPT */
  //   if (action === 'ACCEPTED') {
  //     const oldSlot = {
  //       date: slot.date,
  //       startTime: slot.startTime,
  //       endTime: slot.endTime,
  //     };

  //     const newSlot = slot.reschedule.proposedSlot;

  //     const instructorProfile = await this.instructorProfileModel.findOne({
  //       userId: order.instructorId,
  //     });

  //     if (!instructorProfile) {
  //       throw new NotFoundException('Instructor profile not found');
  //     }

  //     /* 1️⃣ REMOVE OLD SLOT BOOKING */
  //     this.removeBookingByRange(instructorProfile, oldSlot);

  //     /* 2️⃣ UPDATE ORDER SLOT */
  //     slot.date = newSlot.date;
  //     slot.startTime = newSlot.startTime;
  //     slot.endTime = newSlot.endTime;
  //     slot.status = 'RESCHEDULED';

  //     /* 3️⃣ ATTACH NEW SLOT BOOKING */
  //     this.attachBookingByRange(
  //       instructorProfile,
  //       {
  //         date: newSlot.date,
  //         startTime: newSlot.startTime,
  //         endTime: newSlot.endTime,
  //         type: slot.type, // ✅ FIX HERE
  //       },
  //       order._id,
  //     );

  //     await instructorProfile.save();
  //   }

  //   /* ❌ HANDLE REJECT */
  //   if (action === 'REJECTED') {
  //     slot.status = 'BOOKED';
  //   }

  //   /* COMMON UPDATES */
  //   slot.reschedule.status = action;
  //   slot.reschedule.respondedAt = new Date();

  //   slot.notification = {
  //     learner: true,
  //     instructor: true,
  //   };

  //   slot.reschedule = undefined;

  //   await order.save();

  //   return {
  //     success: true,
  //     message: `Slot reschedule ${action.toLowerCase()}`,
  //   };
  // }

  // async respondSlotReschedule(
  //   orderId: string,
  //   slotId: string,
  //   userId: string,
  //   action: 'ACCEPTED' | 'REJECTED',
  // ) {
  //   const order = await this.orderModel.findById(orderId);
  //   if (!order) throw new NotFoundException('Order not found');

  //   const instructorData = await this.instructorProfileModel.findOne({
  //     userId: new Types.ObjectId(userId),
  //   });

  //   const slot = order.bookedSlots.id(slotId);
  //   if (!slot || !slot.reschedule) {
  //     throw new NotFoundException('No reschedule request found');
  //   }

  //   const isLearner = order.learnerId.toString() === userId;

  //   const isInstructor =
  //     instructorData &&
  //     order.instructorId.toString() === instructorData._id.toString();

  //   if (!isLearner && !isInstructor) {
  //     throw new ForbiddenException('Unauthorized');
  //   }

  //   if (
  //     (slot.reschedule.requestedBy === 'LEARNER' && isLearner) ||
  //     (slot.reschedule.requestedBy === 'INSTRUCTOR' && isInstructor)
  //   ) {
  //     throw new ForbiddenException('Requester cannot respond');
  //   }

  //   /* ✅ HANDLE ACCEPT */
  //   if (action === 'ACCEPTED') {
  //     const oldSlot = {
  //       date: slot.date,
  //       startTime: slot.startTime,
  //       endTime: slot.endTime,
  //       type: slot.type, // ✅ FIX
  //     };

  //     const newSlot = slot.reschedule.proposedSlot;

  //     const instructorProfile = await this.instructorProfileModel.findById(
  //       order.instructorId, // ✅ FIX
  //     );

  //     if (!instructorProfile) {
  //       throw new NotFoundException('Instructor profile not found');
  //     }

  //     /* 🚨 Validate conflict */
  //     await this.validateSlotConflict(order.instructorId, {
  //       date: newSlot.date,
  //       startTime: newSlot.startTime,
  //       endTime: newSlot.endTime,
  //       type: slot.type,
  //     });

  //     /* 1️⃣ REMOVE OLD SLOT */
  //     this.removeBookingByRange(instructorProfile, oldSlot);

  //     /* 2️⃣ UPDATE ORDER SLOT */
  //     slot.date = newSlot.date;
  //     slot.startTime = newSlot.startTime;
  //     slot.endTime = newSlot.endTime;
  //     slot.status = 'RESCHEDULED';

  //     /* 3️⃣ ATTACH NEW SLOT */
  //     // this.attachBookingByRange(
  //     //   instructorProfile,
  //     //   {
  //     //     date: newSlot.date,
  //     //     startTime: newSlot.startTime,
  //     //     endTime: newSlot.endTime,
  //     //     type: slot.type,
  //     //   },
  //     //   order._id,
  //     // );
  //     /* 🔓 REMOVE TEMP BLOCK */
  //     this.removeTempBookingByRange(instructorProfile, {
  //       date: newSlot.date,
  //       startTime: newSlot.startTime,
  //       endTime: newSlot.endTime,
  //     });

  //     /* 3️⃣ ATTACH NEW SLOT (REAL BOOKING) */
  //     this.attachBookingByRange(
  //       instructorProfile,
  //       {
  //         date: newSlot.date,
  //         startTime: newSlot.startTime,
  //         endTime: newSlot.endTime,
  //         type: slot.type,
  //       },
  //       order._id,
  //     );

  //     await instructorProfile.save();
  //   }

  //   /* ❌ HANDLE REJECT */
  //   // if (action === 'REJECTED') {
  //   //   slot.status = 'BOOKED';
  //   // }
  //   if (action === 'REJECTED') {
  //     const newSlot = slot.reschedule.proposedSlot;

  //     const instructorProfile = await this.instructorProfileModel.findById(
  //       order.instructorId,
  //     );

  //     if (instructorProfile) {
  //       this.removeTempBookingByRange(instructorProfile, {
  //         date: newSlot.date,
  //         startTime: newSlot.startTime,
  //         endTime: newSlot.endTime,
  //       });

  //       await instructorProfile.save();
  //     }

  //     slot.status = 'BOOKED';
  //   }

  //   /* COMMON */
  //   slot.reschedule.status = action;
  //   slot.reschedule.respondedAt = new Date();

  //   slot.notification = {
  //     learner: true,
  //     instructor: true,
  //   };

  //   slot.reschedule = undefined;

  //   await order.save();

  //   return {
  //     success: true,
  //     message: `Slot reschedule ${action.toLowerCase()}`,
  //   };
  // }

  async respondSlotReschedule(
    orderId: string,
    slotId: string,
    userId: string,
    action: 'ACCEPTED' | 'REJECTED',
  ) {
    const order = await this.orderModel.findById(orderId);
    if (!order) throw new NotFoundException('Order not found');

    const instructorData = await this.instructorProfileModel.findOne({
      userId: new Types.ObjectId(userId),
    });

    const slot = order.bookedSlots.id(slotId);
    if (!slot || !slot.reschedule) {
      throw new NotFoundException('No reschedule request found');
    }

    const isLearner = order.learnerId.toString() === userId;

    const isInstructor =
      instructorData &&
      order.instructorId.toString() === instructorData._id.toString();

    if (!isLearner && !isInstructor) {
      throw new ForbiddenException('Unauthorized');
    }

    if (
      (slot.reschedule.requestedBy === 'LEARNER' && isLearner) ||
      (slot.reschedule.requestedBy === 'INSTRUCTOR' && isInstructor)
    ) {
      throw new ForbiddenException('Requester cannot respond');
    }

    const instructorProfile = await this.instructorProfileModel.findById(
      order.instructorId,
    );

    if (!instructorProfile) {
      throw new NotFoundException('Instructor profile not found');
    }

    const newSlot = slot.reschedule.proposedSlot;

    /* ✅ ACCEPT */
    // if (action === 'ACCEPTED') {
    //   const oldSlot = {
    //     date: slot.date,
    //     startTime: slot.startTime,
    //     endTime: slot.endTime,
    //     type: slot.type,
    //   };

    //   /* 🔓 remove temp block first */
    //   this.removeTempBookingByRange(instructorProfile, newSlot);

    //   /* 🧹 remove old booking */
    //   this.removeBookingByRange(instructorProfile, oldSlot);

    //   /* ✏️ update order slot */
    //   slot.date = newSlot.date;
    //   slot.startTime = newSlot.startTime;
    //   slot.endTime = newSlot.endTime;
    //   slot.status = 'RESCHEDULED';

    //   /* ✅ attach real booking */
    //   this.attachBookingByRange(
    //     instructorProfile,
    //     {
    //       ...newSlot,
    //       type: slot.type,
    //     },
    //     order._id,
    //   );

    //   await instructorProfile.save();
    // }
    if (action === 'ACCEPTED') {

      const oldSlot = {
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        type: slot.type,
      };

      const newSlot = slot.reschedule.proposedSlot;

      this.unlockTempSlots(instructorProfile, order._id);

      this.removeBookingByRange(instructorProfile, oldSlot);

      slot.date = newSlot.date;
      slot.startTime = newSlot.startTime;
      slot.endTime = newSlot.endTime;
      slot.status = 'RESCHEDULED';

      this.attachBookingByRange(
        instructorProfile,
        {
          ...newSlot,
          type: slot.type,
        },
        order._id,
      );

      await instructorProfile.save();
    }

    /* ❌ REJECT */
    // if (action === 'REJECTED') {
    //   /* 🔓 remove temp block */
    //   this.removeTempBookingByRange(instructorProfile, newSlot);

    //   slot.status = 'BOOKED';
    // }
    if (action === 'REJECTED') {

      this.unlockTempSlots(instructorProfile, order._id);

      slot.status = 'BOOKED';
    }

    /* COMMON */
    slot.reschedule.status = action;
    slot.reschedule.respondedAt = new Date();

    slot.notification = {
      learner: true,
      instructor: true,
    };

    slot.reschedule = undefined;

    await order.save();

    return {
      success: true,
      message: `Slot reschedule ${action.toLowerCase()}`,
    };
  }


  private removeBookingByRange(
    instructor: any,
    slot: { date: string; startTime: string; endTime: string; type?: string },
  ) {
    for (const week of instructor.availability?.weeks || []) {
      for (const day of week.days || []) {
        if (day.date !== slot.date) continue;

        for (const s of day.slots || []) {
          if (
            s.startTime === slot.startTime &&
            s.endTime === slot.endTime
          ) {
            s.isBooked = false;
            s.orderId = null;
            s.isTempBlocked= false;
            s.bookingId= null;
          }
        }
      }
    }
  }

  

  async requestSlotReschedule(
    orderId: string,
    slotId: string,
    userId: string,
    dto: RescheduleRequestDto,
  ) {
    const order: any = await this.orderModel
      .findById(orderId)
      .populate({
        path: 'instructorId',
        select: 'userId',
        populate: {
          path: 'userId',
          model: 'User',
          select: 'firstName lastName email profileImage mobileNumber',
        },
      })
      .populate({
        path: 'learnerId',
        select: 'firstName lastName email profileImage mobileNumber',
      });

    if (!order) throw new NotFoundException('Order not found');

    /* ✅ Extract populated data SAFELY */
    const learner = order.learnerId as any;
    const instructorProfile = order.instructorId as any;
    const instructorUser = instructorProfile?.userId as any;

    // const slot = order.bookedSlots.find(s => String(s._id) === slotId);
    const slot = order.bookedSlots.find((s: any) => String(s._id) === slotId);
    if (!slot) throw new NotFoundException('Slot not found');

    if (['COMPLETED', 'CANCEL', 'NOSHOW'].includes(slot.status)) {
      throw new BadRequestException('Slot cannot be rescheduled');
    }

    const instructorData = await this.instructorProfileModel.findOne({
      userId: new Types.ObjectId(userId),
    });

    const isLearner = learner?._id.toString() === userId;

    const isInstructor =
      !!instructorData &&
      order.instructorId._id.toString() === instructorData._id.toString();

    if (!isLearner && !isInstructor) {
      throw new ForbiddenException();
    }

    /* 🕒 Time check */
    const slotStart = this.buildDateTime(slot.date, slot.startTime);

    const hoursBefore =
      (slotStart.getTime() - Date.now()) / (1000 * 60 * 60);

    if (hoursBefore <= 0) {
      throw new BadRequestException('Cannot reschedule past slot');
    }

    if (isLearner && hoursBefore < 24) {
      throw new BadRequestException(
        'Learners cannot reschedule within 24 hours',
      );
    }

    const newStartTime = this.amPmTo24(dto.startTime);
    const newEndTime = this.amPmTo24(dto.endTime);

    const requestedSlotStart = this.buildDateTime(dto.date, newStartTime);

    if (requestedSlotStart.getTime() <= Date.now()) {
      throw new BadRequestException('Requested slot must be future');
    }

    const oldSlot = {
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      
    };

    const newSlot = {
      date: dto.date,
      startTime: newStartTime,
      endTime: newEndTime,
    };

    /* ===============================
       ✅ AUTO APPROVE (LEARNER)
    =============================== */
    if (isLearner && hoursBefore >= 24) {
      const instructorProfileDoc =
        await this.instructorProfileModel.findById(order.instructorId._id);

      if (!instructorProfileDoc) {
        throw new NotFoundException('Instructor profile not found');
      }

      await this.validateSlotConflict(order.instructorId._id, {
        ...newSlot,
        type: slot.type as 'LESSON' | 'TEST',
      });

      this.removeBookingByRange(instructorProfileDoc, {
        ...oldSlot,
        type: slot.type as 'LESSON' | 'TEST',
      });

      /* update order slot */
      slot.date = newSlot.date;
      slot.startTime = newSlot.startTime;
      slot.endTime = newSlot.endTime;
      slot.status = 'RESCHEDULED';

      this.attachBookingByRange(
        instructorProfileDoc,
        {
          ...newSlot,
          type: slot.type as 'LESSON' | 'TEST',
        },
        order._id,
      );

      await instructorProfileDoc.save();

      slot.notification = { learner: true, instructor: true };
      slot.reschedule = undefined;

      await order.save();

      /* ===============================
         🔔 NOTIFICATIONS
      =============================== */

      // 👉 Learner
      try {
        await this.notificationService.sendRescheduleNotification({
          receiverEmail: learner.email,
          receiverName: learner.firstName,
          receiverPhone: learner.mobileNumber,
          role: 'LEARNER',
          action: 'AUTO_APPROVED',
          requestedBy: 'LEARNER',
          oldSlot,
          newSlot,
        });
      } catch (error) {
        console.error('Email failed:', error);
      }

      // 👉 Instructor
      try {
        await this.notificationService.sendRescheduleNotification({
          receiverEmail: instructorUser?.email,
          receiverName: `${instructorUser?.firstName} ${instructorUser?.lastName}`,
          role: 'INSTRUCTOR',
          action: 'AUTO_APPROVED',
          requestedBy: 'LEARNER',
          oldSlot,
          newSlot,
        });
      } catch (error) {
        console.error('Email failed:', error);
      }

      return {
        success: true,
        message: 'Slot rescheduled successfully',
        autoApproved: true,
      };
    }

    /* ===============================
   🔁 REQUEST FLOW
=============================== */

    if (slot.reschedule?.status === 'PENDING') {
      throw new BadRequestException('Reschedule already pending');
    }

    slot.reschedule = {
      requestedBy: isLearner ? 'LEARNER' : 'INSTRUCTOR',
      status: 'PENDING',
      proposedSlot: newSlot,
      requestedAt: new Date(),
    };

    slot.status = 'PENDING_RESCHEDULE';
    slot.notification = { learner: true, instructor: true };

    await order.save();

    if (isInstructor) {
      const instructorProfileDoc =
        await this.instructorProfileModel.findById(order.instructorId._id);

      if (!instructorProfileDoc) {
        throw new NotFoundException('Instructor profile not found');
      }

      // ✅ lock proposed slot
      this.lockSlotTemporarily(
        instructorProfileDoc,
        newSlot,
        order._id,
      );

      await instructorProfileDoc.save();
    }

    if (isLearner) {
      // Learner → notify instructor
      try {
        await this.notificationService.sendRescheduleNotification({
          receiverEmail: instructorUser?.email,
          receiverName: `${instructorUser?.firstName} ${instructorUser?.lastName}`,
          role: 'INSTRUCTOR',
          action: 'REQUESTED',
          requestedBy: 'LEARNER',
          oldSlot,
          newSlot,
        });
      } catch (error) {
        console.error('Email failed:', error);
      }
    }

    return {
      success: true,
      message: 'Reschedule request sent',
      autoApproved: false,
    };
  }

  private buildDateTime(date: string, time24: string): Date {
    const dateParts = date.split('-');
    if (dateParts.length !== 3) {
      throw new BadRequestException('Invalid date format, expected YYYY-MM-DD');
    }

    const year = Number(dateParts[0]);
    const month = Number(dateParts[1]);
    const day = Number(dateParts[2]);

    if (
      Number.isNaN(year) ||
      Number.isNaN(month) ||
      Number.isNaN(day)
    ) {
      throw new BadRequestException('Invalid date values');
    }

    const timeParts = time24.split(':');
    if (timeParts.length < 2) {
      throw new BadRequestException('Invalid time format, expected HH:mm');
    }

    const hour = Number(timeParts[0]);
    const minute = Number(timeParts[1]);

    if (Number.isNaN(hour) || Number.isNaN(minute)) {
      throw new BadRequestException('Invalid time values');
    }

    return new Date(year, month - 1, day, hour, minute, 0);
  }








  async createOrder(learnerId: string, dto: CreateOrderDto) {
    const learnerObjectId = new Types.ObjectId(learnerId);

    /* 1️⃣ Pricing */
    const { instructor, pricePerHour, testPrice } =
      await this.instructorService.getVehiclePricing(
        dto.instructorId,
        dto.vehicleType,
      );

    /* 2️⃣ Normalize slots */
    const slots = this.slotService.normalizeSlots(dto.slots ?? []);

    const lessonSlots = slots.filter(s => s.type === 'LESSON');
    const testSlots = slots.filter(s => s.type === 'TEST');

    const lessonHours = dto.lessonHours ?? 0;

    /* 3️⃣ Duration */
    const lessonSlotHours = lessonSlots.reduce(
      (sum, s) => sum + this.slotService.getDuration(s.startTime, s.endTime),
      0,
    );

    const testCount = testSlots.length;

    /* 4️⃣ Learner */
    const learner = await this.learnerModel.findById(learnerObjectId);
    if (!learner) throw new NotFoundException('Learner not found');

    /* 5️⃣ Validate slots */
    for (const slot of slots) {
      await this.validateSlotConflict(instructor._id, slot);
    }

    /* =====================================================
       ✅ 6️⃣ MAP SLOTS (🔥 FIX HERE)
    ===================================================== */

    const mappedSlots = slots.map((slot) => {
      const base: any = {
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        type: slot.type,
        status: 'BOOKED',
        notification: {
          learner: false,
          instructor: false,
        },
      };

      if (slot.type === 'LESSON') {
        base.pickupLocation = {
          pickupAddress: slot.pickupAddress,
          suburb: slot.suburb,
          state: slot.state,
        };
      }

      if (slot.type === 'TEST') {
        base.testLocation = slot.testLocation;
        base.pickupPoint = slot.pickupPoint;
        base.dropPoint = slot.dropPoint;
      }

      return base;
    });

    /* =====================================================
       7️⃣ LESSON PURCHASE
    ===================================================== */

    const lessonAmount = lessonHours * pricePerHour;

    let discountPercent = 0;
    if (lessonHours >= 10) discountPercent = 10;
    else if (lessonHours >= 5) discountPercent = 5;

    const discount = (lessonAmount * discountPercent) / 100;
    const lessonPayable = lessonAmount - discount;

    const lessonPlatformCharge = lessonHours * 2;

    /* =====================================================
       8️⃣ BOOKING + TEST
    ===================================================== */

    const bookingAmount = lessonSlotHours * pricePerHour;
    const testAmount = testCount * testPrice;

    const totalBookingTestAmount = bookingAmount + testAmount;

    const hasEnoughWallet =
      learner.walletBalance >= totalBookingTestAmount;

    /* =====================================================
       9️⃣ PLATFORM CHARGE
    ===================================================== */

    let platformCharge = lessonPlatformCharge;

    if (!hasEnoughWallet && totalBookingTestAmount > 0) {
      platformCharge +=
        lessonSlotHours * 2 +
        testCount * 5;
    }

    /* =====================================================
       🔟 PAYMENT SPLIT
    ===================================================== */

    let walletUsed = 0;
    let stripeAmount = 0;

    if (totalBookingTestAmount > 0) {
      if (hasEnoughWallet) {
        walletUsed = totalBookingTestAmount;
        stripeAmount = lessonPayable + lessonPlatformCharge;
      } else {
        stripeAmount =
          lessonPayable +
          totalBookingTestAmount +
          platformCharge;
      }
    } else {
      stripeAmount = lessonPayable + lessonPlatformCharge;
    }

    const totalAmount =
      lessonPayable +
      totalBookingTestAmount +
      platformCharge;

    const payableAmount = totalAmount - walletUsed;

    const isFullyPaidByWallet = stripeAmount === 0;

    /* =====================================================
       1️⃣1️⃣ ORDER TYPE
    ===================================================== */

    const parts: string[] = [];

    if (lessonHours > 0) parts.push(`${lessonHours} Lesson Pack`);
    if (lessonSlotHours > 0) parts.push('Book Lessons');
    if (testCount > 0) parts.push('Book Test Package');

    const orderTypeFullName =
      parts.length ? parts.join(' + ') : 'General Order';

    /* =====================================================
       1️⃣2️⃣ CREATE ORDER
    ===================================================== */

    const order = await this.orderModel.create({
      learnerId: learnerObjectId,
      instructorId: instructor._id,

      vehicleType: dto.vehicleType,
      pricePerHour,
      testPrice,

      totalHours: lessonHours,
      usedHours: lessonSlotHours + testCount * 2.5,
      remainingHours:
        lessonHours > 0 ? lessonHours - lessonSlotHours : 0,

      purchaseAmount: lessonPayable,
      bookingAmount: totalBookingTestAmount,
      discount,
      platformCharge,
      totalAmount,

      walletUsed,
      stripeAmount,
      payableAmount,

      bookingMode: slots.length ? 'WITH_SLOTS' : 'WITHOUT_SLOTS',

      bookedSlots: mappedSlots, // ✅ FIXED

      paymentStatus: isFullyPaidByWallet ? 'PAID' : 'PENDING',
      status: isFullyPaidByWallet ? 'CONFIRMED' : 'PENDING_PAYMENT',

      orderTypeFullName,
    });

    /* =====================================================
       1️⃣3️⃣ ATTACH SLOTS (wallet case)
    ===================================================== */

    // if (isFullyPaidByWallet && mappedSlots.length > 0) {
    //   const instructorDoc = await this.instructorProfileModel.findById(
    //     instructor._id,
    //   );

    //   if (!instructorDoc) {
    //     throw new NotFoundException('Instructor not found');
    //   }

    //   for (const slot of slots) {
    //     await this.validateSlotConflict(instructor._id, slot);
    //     this.attachBookingByRange(instructorDoc, slot, order._id);
    //   }

    //   await instructorDoc.save();
    // }
    if (isFullyPaidByWallet && mappedSlots.length > 0) {
      const instructorDoc = await this.instructorProfileModel.findById(
        instructor._id,
      );

      if (!instructorDoc) {
        throw new NotFoundException('Instructor not found');
      }

      /* ✅ SORT SLOTS (CRITICAL FIX) */
      const sortedSlots = [...slots].sort((a, b) => {
        const aStart = this.toMinutes(a.startTime);
        const bStart = this.toMinutes(b.startTime);

        if (aStart !== bStart) return aStart - bStart;

        const aDuration = this.toMinutes(a.endTime) - aStart;
        const bDuration = this.toMinutes(b.endTime) - bStart;

        return aDuration - bDuration;
      });

      /* ✅ ATTACH IN ORDER */
      for (const slot of sortedSlots) {
        await this.validateSlotConflict(instructor._id, slot);

        this.attachBookingByRange(
          instructorDoc,
          {
            date: slot.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            type: slot.type,
          },
          order._id,
        );
      }

      await instructorDoc.save();
    }

    /* =====================================================
       1️⃣4️⃣ WALLET DEBIT
    ===================================================== */

    if (walletUsed > 0) {
      await this.walletService.debitWallet(
        learnerObjectId,
        walletUsed,
        WalletTxnSource.ORDER,
        order._id,
        `wallet-${order._id}`,
        orderTypeFullName,
      );
    }

    //return order;
    /* =====================================================
      1️⃣5️⃣ SEND EMAIL NOTIFICATIONS
   ===================================================== */

    if (order.status === 'CONFIRMED') {
      const populatedOrder = (await this.orderModel
        .findById(order._id)
        .populate('learnerId', 'firstName lastName email mobileNumber')
        .populate({
          path: 'instructorId',
          populate: {
            path: 'userId',
            select: 'firstName lastName email mobileNumber',
          },
        })
        .lean()) as PopulatedOrder | null; // ✅ IMPORTANT (fixes TS + ObjectId issues)

      if (!populatedOrder) {
        this.logger.warn('Order not found after creation (email skipped)');
        return order;
      }

      const learnerUser = populatedOrder.learnerId as any;
      const instructorUser = populatedOrder.instructorId?.userId as any;

      if (!learnerUser?.email) {
        this.logger.warn('Missing learner email');
        return order;
      }

      try {
        await this.notificationService.sendOrderCreatedEmail({
          learnerEmail: learnerUser.email,
          learnerName: learnerUser.firstName,

          instructorEmail: instructorUser?.email,
          instructorName: instructorUser
            ? `${instructorUser.firstName} ${instructorUser.lastName}`
            : undefined,

          // learnerPhone: learnerUser?.mobileNumber,
          // instructorPhone: instructorUser?.mobileNumber,

          order: populatedOrder,
        });
      } catch (err) {
        this.logger.error('Order email failed', err);
      }
    }

    /* ===================================================== */

    return order;
  }


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


  // private attachBookingByRange(
  //   instructor: InstructorProfileDocument,
  //   slot: NormalizedSlot,
  //   orderId: Types.ObjectId,
  // ): void {
  //   const reqStart = this.toMinutes(slot.startTime);
  //   const reqEnd = this.toMinutes(slot.endTime);

  //   for (const week of instructor.availability.weeks) {
  //     const day = week.days.find(d => d.date === slot.date);
  //     if (!day) continue;

  //     // 1️⃣ Validate requested slot fits inside availability
  //     const insideAvailability = day.slots.some(s => {
  //       const sStart = this.toMinutes(s.startTime);
  //       const sEnd = this.toMinutes(s.endTime);
  //       return reqStart >= sStart && reqEnd <= sEnd;
  //     });

  //     if (!insideAvailability) {
  //       throw new BadRequestException(
  //         `Requested slot ${slot.startTime}-${slot.endTime} is outside availability`,
  //       );
  //     }

  //     // 2️⃣ Check overlap with booked slots
  //     const conflict = day.slots.some(s => {
  //       if (!s.isBooked) return false;

  //       const bStart = this.toMinutes(s.startTime);
  //       const bEnd = this.toMinutes(s.endTime);

  //       return reqStart < bEnd && reqEnd > bStart;
  //     });

  //     if (conflict) {
  //       throw new BadRequestException(
  //         `Requested slot overlaps an existing booking on ${slot.date}`,
  //       );
  //     }

  //     // 3️⃣ Insert booked slot
  //     day.slots.push({
  //       startTime: slot.startTime,
  //       endTime: slot.endTime,
  //       isBooked: true,
  //       bookingId: orderId,
  //       type: slot.type,
  //       pickupAddress: slot.pickupAddress,
  //       suburb: slot.suburb,
  //       state: slot.state,
  //     } as any);

  //     return;
  //   }

  //   throw new BadRequestException(
  //     `Instructor not available on ${slot.date}`,
  //   );
  // }


  // async handleStripeWebhook(payload: Buffer, signature: string) {
  //   const event = this.stripe.webhooks.constructEvent(
  //     payload,
  //     signature,
  //     process.env['STRIPE_WEBHOOK_SECRET']!,
  //   );

  //   if (event.type === 'payment_intent.succeeded') {
  //     const intent = event.data.object as Stripe.PaymentIntent;

  //     const orderId = intent.metadata['orderId'];

  //     if (!orderId) {
  //       throw new BadRequestException('Order ID missing in Stripe metadata');
  //     }

  //     await this.privateOrderModel.updateOne(
  //       { _id: orderId },
  //       {
  //         status: OrderStatus.PAID,
  //         paidAt: new Date(),
  //       },
  //     );
  //   }


  //   if (event.type === 'payment_intent.payment_failed') {
  //     const intent = event.data.object as Stripe.PaymentIntent;

  //     await this.privateOrderModel.updateOne(
  //       { stripePaymentIntentId: intent.id },
  //       { status: OrderStatus.FAILED },
  //     );
  //   }

  //   return { received: true };
  // }

  private validateBookingRules(
    sStart: number,
    sEnd: number,
    reqStart: number,
    reqEnd: number,
  ) {
    const GAP = 30;

    const duration = reqEnd - reqStart;

    // ✅ Allowed durations
    if (![60, 120, 150].includes(duration)) {
      throw new BadRequestException(
        'Only 1h, 2h or 2.5h bookings allowed',
      );
    }

    /* -----------------------------------------
       ✅ AFTER GAP VALIDATION
    ----------------------------------------- */

    const remainingAfter = sEnd - reqEnd;

    if (remainingAfter > 0 && remainingAfter < GAP + 60) {
      throw new BadRequestException(
        'Not enough space after booking for gap + next slot',
      );
    }

    /* -----------------------------------------
       ✅ BEFORE GAP VALIDATION
    ----------------------------------------- */

    const remainingBefore = reqStart - sStart;

    if (remainingBefore > 0 && remainingBefore < GAP + 60) {
      throw new BadRequestException(
        'Not enough space before booking for gap + slot',
      );
    }
  }

  // private attachBookingByRange(
  //   instructor: InstructorProfileDocument,
  //   slot: NormalizedSlot,
  //   orderId: Types.ObjectId,
  // ): void {

  //   const reqStart = this.toMinutes(slot.startTime);
  //   const reqEnd = this.toMinutes(slot.endTime);

  //   for (const week of instructor.availability.weeks) {

  //     const day = week.days.find(d => d.date === slot.date);
  //     if (!day) continue;

  //     for (let i = 0; i < day.slots.length; i++) {

  //       const s = day.slots[i];
  //       if (!s) continue;

  //       const sStart = this.toMinutes(s.startTime);
  //       const sEnd = this.toMinutes(s.endTime);

  //       if (reqStart >= sStart && reqEnd <= sEnd && !s.isBooked) {

  //         const newSlots: any[] = [];

  //         // before part
  //         if (reqStart > sStart) {
  //           newSlots.push({
  //             startTime: s.startTime,
  //             endTime: slot.startTime,
  //             isBooked: false,
  //           });
  //         }

  //         // 🔒 TEMP BLOCK SLOT
  //         newSlots.push({
  //           startTime: slot.startTime,
  //           endTime: slot.endTime,
  //           isBooked: true,              // ✅ MUST
  //           isTempBlocked: true,         // ✅ NEW FLAG
  //           bookingId: orderId,
  //         });

  //         // after part
  //         if (reqEnd < sEnd) {
  //           newSlots.push({
  //             startTime: slot.endTime,
  //             endTime: s.endTime,
  //             isBooked: false,
  //           });
  //         }

  //         day.slots.splice(i, 1, ...newSlots);
  //         return;
  //       }
  //     }
  //   }

  //   throw new BadRequestException(
  //     `Instructor not available ${slot.startTime}-${slot.endTime} on ${slot.date}`,
  //   );
  // }
  private attachBookingByRange(
    instructor: InstructorProfileDocument,
    slot: NormalizedSlot,
    orderId: Types.ObjectId,
  ): void {

    const reqStart = this.toMinutes(slot.startTime);
    const reqEnd = this.toMinutes(slot.endTime);
    const GAP = 30;

    for (const week of instructor.availability.weeks) {
      const day = week.days.find(d => d.date === slot.date);
      if (!day) continue;

      for (let i = 0; i < day.slots.length; i++) {
        const s = day.slots[i];
        if (!s) continue;

        const sStart = this.toMinutes(s.startTime);
        const sEnd = this.toMinutes(s.endTime);

        if (reqStart >= sStart && reqEnd <= sEnd && !s.isBooked) {

          /* 🔥 VALIDATION */
          this.validateBookingRules(sStart, sEnd, reqStart, reqEnd);

          const baseMeta = {
            pickupAddress: s.pickupAddress,
            suburb: s.suburb,
            state: s.state,
          };

          const newSlots: any[] = [];

          /* ===============================
             BEFORE SLOT (with GAP)
          =============================== */

          const beforeEndMinutes = reqStart - GAP;

          if (beforeEndMinutes > sStart) {
            newSlots.push({
              ...baseMeta,
              startTime: s.startTime,
              endTime: this.toTimeString(beforeEndMinutes),
              isBooked: false,
            });
          }

          /* ===============================
             BOOKED SLOT
          =============================== */

          newSlots.push({
            ...baseMeta,
            startTime: slot.startTime,
            endTime: slot.endTime,
            isBooked: true,
            bookingId: orderId,
          });

          /* ===============================
             AFTER SLOT (with GAP)
          =============================== */

          const afterStartMinutes = reqEnd + GAP;

          if (afterStartMinutes < sEnd) {
            newSlots.push({
              ...baseMeta,
              startTime: this.toTimeString(afterStartMinutes),
              endTime: s.endTime,
              isBooked: false,
            });
          }

          /* ===============================
             APPLY SPLIT
          =============================== */

          day.slots.splice(i, 1, ...newSlots);

          // ✅ keep sorted
          day.slots.sort((a, b) =>
            a.startTime.localeCompare(b.startTime),
          );

          return;
        }
      }
    }

    throw new BadRequestException(
      `Instructor not available ${slot.startTime}-${slot.endTime} on ${slot.date}`,
    );
  }

  private toTimeString(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;

    return `${h.toString().padStart(2, '0')}:${m
      .toString()
      .padStart(2, '0')}`;
  }

  async getUpcomingStats(instructorId: string) {
    const today = new Date().toISOString().split('T')[0];
    const instructor = await this.instructorProfileModel.findOne({ userId: new Types.ObjectId(instructorId) })

    const result = await this.orderModel.aggregate([
      {
        $match: {
          instructorId: new Types.ObjectId(instructor?._id),
        },
      },
      {
        $unwind: "$bookedSlots",
      },
      {
        $match: {
          "bookedSlots.date": { $gte: today },
          "bookedSlots.status": { $in: ["BOOKED", "RESCHEDULED"] },
        },
      },
      {
        $group: {
          _id: "$bookedSlots.type",
          count: { $sum: 1 },
        },
      },
    ]);

    let lessons = 0;
    let tests = 0;

    result.forEach((r) => {
      if (r._id === "LESSON") lessons = r.count;
      if (r._id === "TEST") tests = r.count;
    });

    return {
      totalUpcomingBookedLessons: lessons,
      totalUpcomingTestPackages: tests,
    };
  }

  async getPendingPayout(instructorId: string) {

    const instructor = await this.instructorProfileModel.findOne({ userId: new Types.ObjectId(instructorId) })

    const result = await this.instructorTransactionModel.aggregate([
      {
        $match: {
          instructorId: new Types.ObjectId(instructor?._id),
          payoutStatus: "PENDING_PAYOUT",
        },
      },
      {
        $group: {
          _id: null,
          totalPending: { $sum: "$instructorEarning" },
        },
      },
    ]);

    return {
      pendingPayout: result[0]?.totalPending || 0,
    };
  }


  async getNotifications(
    userId: string,
    role: 'learner' | 'instructor',
  ) {
    let instructorId: Types.ObjectId | null = null;

    if (role === 'instructor') {
      const instructorData = await this.instructorProfileModel
        .findOne({ userId: new Types.ObjectId(userId) })
        .select({ _id: 1 })
        .lean();

      if (!instructorData) {
        throw new NotFoundException('Instructor profile not found');
      }

      instructorId = instructorData._id;
    }

    const match =
      role === 'learner'
        ? { learnerId: new Types.ObjectId(userId) }
        : { instructorId };

    const notificationField =
      role === 'learner'
        ? 'bookedSlots.notification.learner'
        : 'bookedSlots.notification.instructor';

    const orders = await this.orderModel.find({
      ...match,
      [notificationField]: true,
    });

    return orders;
  }

  async markNotificationRead(
    userId: string,
    slotId: string,
    role: 'learner' | 'instructor',
  ) {
    let instructorId: Types.ObjectId | null = null;

    if (role === 'instructor') {
      const instructor = await this.instructorProfileModel
        .findOne({ userId: new Types.ObjectId(userId) })
        .select({ _id: 1 })
        .lean();

      if (!instructor) {
        throw new NotFoundException('Instructor profile not found');
      }

      instructorId = instructor._id;
    }

    const match =
      role === 'learner'
        ? {
          learnerId: new Types.ObjectId(userId),
          'bookedSlots._id': new Types.ObjectId(slotId),
        }
        : {
          instructorId,
          'bookedSlots._id': new Types.ObjectId(slotId),
        };

    const updateField =
      role === 'learner'
        ? 'bookedSlots.$.notification.learner'
        : 'bookedSlots.$.notification.instructor';

    const updated = await this.orderModel.findOneAndUpdate(
      match,
      {
        $set: {
          [updateField]: false,
        },
      },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException('Notification not found');
    }

    return {
      success: true,
      message: 'Notification marked as read',
    };
  }

  async markAllNotificationsRead(
    userId: string,
    role: 'learner' | 'instructor',
  ) {
    let instructorId: Types.ObjectId | null = null;

    if (role === 'instructor') {
      const instructor = await this.instructorProfileModel
        .findOne({ userId: new Types.ObjectId(userId) })
        .select({ _id: 1 })
        .lean();

      if (!instructor) {
        throw new NotFoundException('Instructor profile not found');
      }

      instructorId = instructor._id;
    }

    const match =
      role === 'learner'
        ? { learnerId: new Types.ObjectId(userId) }
        : { instructorId };

    const updateField =
      role === 'learner'
        ? 'bookedSlots.$[].notification.learner'
        : 'bookedSlots.$[].notification.instructor';

    await this.orderModel.updateMany(
      match,
      {
        $set: {
          [updateField]: false,
        },
      },
    );

    return {
      success: true,
      message: 'All notifications marked as read',
    };
  }


  // private async validateSlotConflict(
  //   instructorId: Types.ObjectId,
  //   slot: NormalizedSlot,
  // ): Promise<void> {

  //   const existingOrders = await this.orderModel.find({
  //     instructorId,
  //     paymentStatus: 'PAID',
  //     status: 'CONFIRMED',
  //     'bookedSlots.date': slot.date,
  //   });

  //   const reqStart = this.toMinutes(slot.startTime);
  //   const reqEnd = this.toMinutes(slot.endTime);

  //   for (const order of existingOrders) {

  //     for (const existingSlot of order.bookedSlots) {

  //       if (existingSlot.date !== slot.date) continue;

  //       const existingStart = this.toMinutes(existingSlot.startTime);
  //       const existingEnd = this.toMinutes(existingSlot.endTime);

  //       // ✅ Overlap formula
  //       if (reqStart < existingEnd && reqEnd > existingStart && existingSlot.status !== 'CANCELLED') {
  //         throw new BadRequestException(
  //           `Slot ${slot.startTime}-${slot.endTime} overlaps with existing booking ${existingSlot.startTime}-${existingSlot.endTime}`,
  //         );
  //       }
  //     }
  //   }
  // }

  private async validateSlotConflict(
    instructorId: Types.ObjectId,
    slot: NormalizedSlot,
  ): Promise<void> {

    const instructor = await this.instructorProfileModel.findById(instructorId);

    if (!instructor) {
      throw new NotFoundException('Instructor not found');
    }

    const toMinutes = (time: string): number => {
      const t =
        time.toUpperCase().includes('AM') ||
          time.toUpperCase().includes('PM')
          ? this.amPmTo24(time)
          : time;

      const [h = 0, m = 0] = t.split(':').map(Number);
      return h * 60 + m;
    };

    const reqStart = toMinutes(slot.startTime);
    const reqEnd = toMinutes(slot.endTime);

    let matchedSlot: any = null;

    for (const week of instructor.availability?.weeks || []) {
      for (const day of week.days) {
        if (day.date !== slot.date) continue;

        for (const s of day.slots) {
          const dbStart = toMinutes(s.startTime);
          const dbEnd = toMinutes(s.endTime);

          if (reqStart >= dbStart && reqEnd <= dbEnd) {
            matchedSlot = s;
            break;
          }
        }
      }
    }

    if (!matchedSlot) {
      throw new BadRequestException(
        `Slot ${slot.startTime}-${slot.endTime} is outside availability`,
      );
    }

    if (matchedSlot.isBooked) {
      throw new BadRequestException(
        `Slot ${slot.startTime}-${slot.endTime} already booked`,
      );
    }
  }


  // private attachTempBookingByRange(
  //   instructor: any,
  //   slot: any,
  //   orderId: Types.ObjectId,
  // ) {
  //   const reqStart = this.toMinutes(slot.startTime);
  //   const reqEnd = this.toMinutes(slot.endTime);

  //   for (const week of instructor.availability.weeks) {
  //     const day = week.days.find((d: any) => d.date === slot.date);
  //     if (!day) continue;

  //     for (let i = 0; i < day.slots.length; i++) {
  //       const s = day.slots[i];
  //       if (!s) continue;

  //       const sStart = this.toMinutes(s.startTime);
  //       const sEnd = this.toMinutes(s.endTime);

  //       if (reqStart >= sStart && reqEnd <= sEnd && !s.isBooked) {
  //         const newSlots: any[] = [];

  //         if (reqStart > sStart) {
  //           newSlots.push({
  //             startTime: s.startTime,
  //             endTime: slot.startTime,
  //             isBooked: false,
  //           });
  //         }

  //         /* 🔒 TEMP BLOCK SLOT */
  //         newSlots.push({
  //           startTime: slot.startTime,
  //           endTime: slot.endTime,
  //           isBooked: false,
  //           isTempBlocked: true,
  //           tempBookingId: orderId,
  //         });

  //         if (reqEnd < sEnd) {
  //           newSlots.push({
  //             startTime: slot.endTime,
  //             endTime: s.endTime,
  //             isBooked: false,
  //           });
  //         }

  //         day.slots.splice(i, 1, ...newSlots);
  //         return;
  //       }
  //     }
  //   }

  //   throw new BadRequestException(
  //     `Instructor not available for temp lock`,
  //   );
  // }

  private attachTempBookingByRange(
    instructor: InstructorProfileDocument,
    slot: NormalizedSlot,
  ) {
    const reqStart = this.toMinutes(slot.startTime);
    const reqEnd = this.toMinutes(slot.endTime);

    for (const week of instructor.availability.weeks) {
      const day = week.days.find(d => d.date === slot.date);
      if (!day) continue;

      for (const s of day.slots) {
        const sStart = this.toMinutes(s.startTime);
        const sEnd = this.toMinutes(s.endTime);

        // ✅ exact match OR fully inside slot
        if (reqStart >= sStart && reqEnd <= sEnd && !s.isBooked) {
          s.isTempBlocked = true;
        }
      }
    }
  }

  private removeTempBookingByRange(
    instructor: InstructorProfileDocument,
    slot: { date: string; startTime: string; endTime: string },
  ) {
    const reqStart = this.toMinutes(slot.startTime);
    const reqEnd = this.toMinutes(slot.endTime);

    for (const week of instructor.availability.weeks) {
      const day = week.days.find(d => d.date === slot.date);
      if (!day) continue;

      day.slots.forEach((s: any) => {
        const sStart = this.toMinutes(s.startTime);
        const sEnd = this.toMinutes(s.endTime);

        if (reqStart < sEnd && reqEnd > sStart) {
          s.isTempBlocked = false;
        }
      });
    }
  }

  private lockSlotTemporarily(
    instructor: InstructorProfileDocument,
    slot: { date: string; startTime: string; endTime: string },
    orderId: Types.ObjectId,
  ) {
    const reqStart = this.toMinutes(slot.startTime);
    const reqEnd = this.toMinutes(slot.endTime);

    for (const week of instructor.availability.weeks) {
      const day = week.days.find(d => d.date === slot.date);
      if (!day) continue;

      for (const s of day.slots) {
        const sStart = this.toMinutes(s.startTime);
        const sEnd = this.toMinutes(s.endTime);

        // ✅ overlap check
        if (reqStart < sEnd && reqEnd > sStart) {
          s.isTempBlocked = true;
          s.tempBlockedAt = new Date();
          s.tempBlockedTill = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hrs
          s.tempBookingId = orderId;
        }
      }
    }
  }

  private unlockTempSlots(
    instructor: InstructorProfileDocument,
    orderId: Types.ObjectId,
  ) {
    for (const week of instructor.availability.weeks) {
      for (const day of week.days) {
        for (const s of day.slots) {
          if (s.tempBookingId?.toString() === orderId.toString()) {
            s.isTempBlocked = false;
            s.tempBlockedAt = null;
            s.tempBlockedTill = null;
            s.tempBookingId = null;
          }
        }
      }
    }
  }

  @Cron('*/5 * * * *', {
    name: 'release-temp-locks',
  }) // every 5 mins
  async releaseExpiredTempLocks() {
    console.log("service running every 5mins")
    const instructors = await this.instructorProfileModel.find();

    const now = new Date();

    for (const instructor of instructors) {
      let changed = false;

      for (const week of instructor.availability.weeks) {
        for (const day of week.days) {
          for (const slot of day.slots) {
            if (
              slot.isTempBlocked &&
              slot.tempBlockedTill &&
              slot.tempBlockedTill < now
            ) {
              slot.isTempBlocked = false;
              slot.tempBlockedAt = null;
              slot.tempBlockedTill = null;
              slot.tempBookingId = null;
              changed = true;
            }
          }
        }
      }

      if (changed) {
        await instructor.save();
      }
    }
  }
}




