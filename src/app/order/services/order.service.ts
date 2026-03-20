import {
  BadRequestException,
  ForbiddenException,
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

// interface NormalizedSlot {
//   date: string;
//   startTime: string; // 24h HH:mm
//   endTime: string;
//   type: SlotType;
//   pickupAddress: string;
//   suburb: string;
//   state: string;
// }


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




    private readonly privateLearnerService: PrivateLearnerService,

    @InjectModel(InstructorProfile.name)
    private readonly instructorProfileModel: Model<InstructorProfileDocument>,

    @InjectModel(Slot.name)
    private readonly slotModel: Model<SlotDocument>,

    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,

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
  async createPrivateOrder(
    instructorId: string,
    dto: CreatePrivateOrderDto,
  ) {
    let learner;

    // 1️⃣ Resolve learner
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

    // 2️⃣ Load instructor profile ONCE
    const instructorProfile = await this.instructorProfileModel
      .findOne({ userId: new Types.ObjectId(instructorId) })
      .select({ vehicles: 1 })
      .lean();

    if (!instructorProfile) {
      throw new BadRequestException('Instructor profile not found');
    }

    // 3️⃣ Lesson slots pricing
    const lessonSlots = dto.lessonSlots.map(slot => {
      const hourlyPrice = this.resolvePrivatePrice(
        instructorProfile,
        learner.preferredVehicleType,
        false,
      );

      return {
        ...slot,
        price: hourlyPrice * slot.bookingPeriod,
      };
    });

    // 4️⃣ Test package pricing
    let testPackage;
    if (dto.testPackage) {
      const testPrice = this.resolvePrivatePrice(
        instructorProfile,
        learner.preferredVehicleType,
        true,
      );

      testPackage = {
        ...dto.testPackage,
        price: testPrice,
      };
    }

    // 5️⃣ Total
    const totalAmount =
      lessonSlots.reduce((sum, s) => sum + s.price, 0) +
      (testPackage?.price || 0);

    // 6️⃣ Create private order
    const orderData = await this.privateOrderModel.create({
      instructorId: new Types.ObjectId(instructorId),
      privateLearnerId: learner._id,
      vehicleType: learner.preferredVehicleType,
      lessonSlots,
      testPackage,
      totalAmount,
    });

    if (!orderData?._id) {
      throw new BadRequestException('Failed to create private order');
    }

    return orderData;

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
    role: FeedbackOwnerType,
  ) {

    const order = await this.orderModel.findById(orderId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const slot = order.bookedSlots.id(slotId);

    if (!slot) {
      throw new NotFoundException('Slot not found');
    }

    
    if (slot.status !== 'BOOKED' && slot.status !== 'RESCHEDULED') {
      throw new BadRequestException('Slot not cancellable');
    }

    const within24h = this.isWithin24Hours(
      slot.date,
      slot.startTime,
    );

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

    let refund = 0;


    if (!within24h) {

      const hours = this.calculateSlotHours(
        slot.startTime,
        slot.endTime,
      );

      const grossAmount = hours * order.pricePerHour;
      refund = grossAmount;



      // await this.instructorTransactionModel.create({
      //   instructorId: order.instructorId,
      //   learnerId: order.learnerId,
      //   orderId: order._id,
      //   slotId: slot._id,
      //   type: slot.type,
      //   hours: hours,
      //   pricePerHour: order.pricePerHour,
      //   grossAmount: grossAmount,
      //   instructorEarning: 0
      // });

    }

    await order.save();

    /**
     * Free instructor slot
     */
    await this.instructorProfileModel.updateOne(
      { _id: order.instructorId },
      {
        $pull: {
          "availability.weeks.$[].days.$[day].slots": {
            startTime: normalizeTime(slot.startTime),
            endTime: normalizeTime(slot.endTime)
          }
        }
      },
      {
        arrayFilters: [
          { "day.date": slot.date } // date is string
        ]
      }
    );

    /**
     * Wallet refund
     */
    if (refund > 0) {

      const learner = await this.learnerModel.findById(order.learnerId);

      if (!learner) {
        throw new NotFoundException('Learner not found');
      }

      learner.walletBalance += refund;

      await learner.save();

      await this.walletModel.create({
        learnerId: order.learnerId,
        userId: order.learnerId,
        role: "learner",
        type: 'CREDIT',
        amount: refund,
        balanceAfter: learner.walletBalance,
        source: 'SLOT_CANCELLED',
        referenceEntityId: order._id
      });
    }

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
    const order = await this.orderModel.findById(orderId);
    if (!order) throw new NotFoundException('Order not found');

    const slot = order.bookedSlots.id(slotId);
    if (!slot) throw new NotFoundException('Slot not found');

    if (slot.status !== 'BOOKED' && slot.status !== 'RESCHEDULED') {
      throw new BadRequestException(
        `Slot cannot be completed from ${slot.status}`,
      );
    }
    // if (slot.status !== 'BOOKED')
    //   throw new BadRequestException('Invalid slot state');

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

    // ❌ No wallet refund
    await order.save();

    return { success: true, message: 'Slot marked as no-show' };
  }


  // async completeSlot(
  //   orderId: string,
  //   slotId: string,
  //   userId: string,
  // ) {
  //   const order = await this.orderModel.findById(orderId);
  //   if (!order) throw new NotFoundException('Order not found');

  //   const slot = order.bookedSlots.find(
  //     s => String(s._id) === slotId,
  //   );
  //   if (!slot) throw new NotFoundException('Slot not found');

  //   if (slot.status !== 'BOOKED' && slot.status !== 'RESCHEDULED') {
  //     throw new BadRequestException(
  //       `Slot cannot be completed from ${slot.status}`,
  //     );
  //   }

  //   const start = normalizeTime(slot.startTime);
  //   const end = normalizeTime(slot.endTime);

  //   const hours = calculateSlotDurationInHours(start, end);

  //   // ✅ Update slot
  //   slot.status = 'COMPLETED';
  //   slot.notification = {
  //     learner: true,
  //     instructor: true,
  //   };
  //   // ✅ Update order usage
  //   order.usedHours += hours;
  //   order.remainingHours = Math.max(
  //     0,
  //     order.totalHours - order.usedHours,
  //   );

  //   if (order.remainingHours === 0) {
  //     order.scheduleStatus = 'FULLY_SCHEDULED';
  //   }

  //   await order.save();

  //   // ✅ Increase instructor totalLessons
  //   await this.instructorProfileModel.updateOne(
  //     { _id: new Types.ObjectId(order.instructorId) },
  //     {
  //       $inc: {
  //         totalHours: hours,
  //       },
  //     },
  //   );

  //   await this.instructorTransactionModel.create({
  //     orderId: order._id,
  //     slotId: slot._id,
  //     learnerId: order.learnerId,
  //     instructorId: order.instructorId,
  //     type: slot.type,
  //     hours: hours,
  //     pricePerHour: order.pricePerHour,
  //     grossAmount: hours * order.pricePerHour,
  //     platformCommission: order.platformCharge,
  //     instructorEarning:
  //       (hours * order.pricePerHour) - order.platformCharge,
  //   });

  //   return {
  //     success: true,
  //     message: 'Slot marked as completed',
  //     completedHours: hours,
  //   };
  // }

  async completeSlot(
    orderId: string,
    slotId: string,
    userId: string,
  ) {
    const order = await this.orderModel.findById(orderId);
    if (!order) throw new NotFoundException('Order not found');

    const slot = order.bookedSlots.find(
      s => String(s._id) === slotId,
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

    // ✅ Update slot
    slot.status = 'COMPLETED';
    slot.notification = {
      learner: true,
      instructor: true,
    };

    // ✅ Update order usage
    order.usedHours += hours;
    order.remainingHours = Math.max(
      0,
      order.totalHours - order.usedHours,
    );

    if (order.remainingHours === 0) {
      order.scheduleStatus = 'FULLY_SCHEDULED';
    }

    await order.save();

    // ✅ Increase instructor hours
    await this.instructorProfileModel.updateOne(
      { _id: new Types.ObjectId(order.instructorId) },
      {
        $inc: {
          totalHours: hours,
        },
      },
    );

    // ✅ Create instructor transaction

    let grossAmount = 0;
    let pricePerHour = 0;
    if (slot.type === 'LESSON') {
      grossAmount = hours * order.pricePerHour;
      pricePerHour = order.pricePerHour;
    }

    if (slot.type === 'TEST') {
      // ⚠️ Use testPrice (you must store this in order)
      grossAmount = order.testPrice;
      pricePerHour = order.testPrice;
    }

    // ✅ Commission
    const platformCommission = grossAmount * 0.17;
    const instructorEarning = grossAmount - platformCommission;

    const txn = await this.instructorTransactionModel.create({
      orderId: order._id,
      slotId: slot._id,
      learnerId: order.learnerId,
      instructorId: order.instructorId,
      type: slot.type,
      hours: hours,
      pricePerHour: pricePerHour,
      grossAmount: grossAmount,
      platformCommission: platformCommission,
      instructorEarning: instructorEarning,
    });

    // ✅ CREDIT instructor wallet
    await this.payoutService.creditInstructorWallet(txn._id);

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
  
    /* ✅ HANDLE ACCEPT */
    if (action === 'ACCEPTED') {
      const oldSlot = {
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        type: slot.type, // ✅ FIX
      };
  
      const newSlot = slot.reschedule.proposedSlot;
  
      const instructorProfile = await this.instructorProfileModel.findById(
        order.instructorId, // ✅ FIX
      );
  
      if (!instructorProfile) {
        throw new NotFoundException('Instructor profile not found');
      }
  
      /* 🚨 Validate conflict */
      await this.validateSlotConflict(order.instructorId, {
        date: newSlot.date,
        startTime: newSlot.startTime,
        endTime: newSlot.endTime,
        type: slot.type,
      });
  
      /* 1️⃣ REMOVE OLD SLOT */
      this.removeBookingByRange(instructorProfile, oldSlot);
  
      /* 2️⃣ UPDATE ORDER SLOT */
      slot.date = newSlot.date;
      slot.startTime = newSlot.startTime;
      slot.endTime = newSlot.endTime;
      slot.status = 'RESCHEDULED';
  
      /* 3️⃣ ATTACH NEW SLOT */
      this.attachBookingByRange(
        instructorProfile,
        {
          date: newSlot.date,
          startTime: newSlot.startTime,
          endTime: newSlot.endTime,
          type: slot.type,
        },
        order._id,
      );
  
      await instructorProfile.save();
    }
  
    /* ❌ HANDLE REJECT */
    if (action === 'REJECTED') {
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
        }
      }
    }
  }
}



  // async requestSlotReschedule(
  //   orderId: string,
  //   slotId: string,
  //   userId: string,
  //   dto: RescheduleRequestDto,
  // ) {

  //   const order = await this.orderModel.findById(orderId);
  //   if (!order) throw new NotFoundException('Order not found');

  //   const slot = order.bookedSlots.find(s => String(s._id) === slotId);
  //   if (!slot) throw new NotFoundException('Slot not found');

  //   if (['COMPLETED', 'CANCEL', 'NOSHOW'].includes(slot.status)) {
  //     throw new BadRequestException('Slot cannot be rescheduled');
  //   }

  //   const instructorData = await this.instructorProfileModel.findOne(
  //     { userId: new Types.ObjectId(userId) }
  //   );
  //   const isLearner = order.learnerId.toString() === userId;
  //   const isInstructor = order.instructorId.toString() === instructorData?.id.toString();
  //   this.logger.log(JSON.stringify(isInstructor))

  //   if (!isLearner && !isInstructor) {
  //     throw new ForbiddenException();
  //   }


  //   const dateParts = slot.date.split('-');

  //   if (dateParts.length !== 3) {
  //     throw new BadRequestException('Invalid slot date format');
  //   }

  //   const year = Number(dateParts[0]);
  //   const month = Number(dateParts[1]);
  //   const day = Number(dateParts[2]);

  //   const timeParts = slot.startTime.split(':');

  //   if (timeParts.length < 2) {
  //     throw new BadRequestException('Invalid slot time format');
  //   }

  //   const hour = Number(timeParts[0]);
  //   const minute = Number(timeParts[1]);

  //   const slotStart = new Date(
  //     year,
  //     month - 1,
  //     day,
  //     hour,
  //     minute,
  //     0,
  //   );

  //   const now = new Date(); // ✅ LOCAL time

  //   const diffMs = slotStart.getTime() - now.getTime();
  //   const hoursBefore = diffMs / (1000 * 60 * 60);

  //   this.logger.debug({
  //     slotStartLocal: slotStart.toString(),
  //     nowLocal: now.toString(),
  //     hoursBefore,
  //   });

  //   if (hoursBefore <= 0) {
  //     throw new BadRequestException(
  //       'Cannot reschedule a past or ongoing slot',
  //     );
  //   }

  //   if (isLearner && hoursBefore < 24) {
  //     throw new BadRequestException(
  //       'Learners cannot reschedule within 24 hours of the slot' + hoursBefore + '=' + isLearner,
  //     );
  //   }


  //   // ✅ Validate NEW slot datetime (future)
  //   const requestedSlotStart = this.buildDateTime(
  //     dto.date,
  //     this.amPmTo24(dto.startTime),
  //   );

  //   if (requestedSlotStart.getTime() <= Date.now()) {
  //     throw new BadRequestException(
  //       'Requested slot must be in the future',
  //     );
  //   }


  //   // ⛔ Learner already requested
  //   if (isLearner && slot.status === 'PENDING_RESCHEDULE') {
  //     throw new BadRequestException(
  //       'Reschedule request already in progress',
  //     );
  //   }

  //   // ⛔ Learner < 24 hours → BLOCK
  //   if (isLearner && hoursBefore < 24) {
  //     throw new BadRequestException(
  //       'Learners cannot reschedule within 24 hours of the slot',
  //     );
  //   }

  //   // ✅ Learner ≥ 24 hours → AUTO APPROVE
  //   if (isLearner && hoursBefore >= 24) {
  //     slot.date = dto.date;
  //     slot.startTime = this.amPmTo24(dto.startTime);
  //     slot.endTime = this.amPmTo24(dto.endTime);
  //     slot.status = 'RESCHEDULED';
  //     slot.notification = {
  //       learner: true,
  //       instructor: true,
  //     };
  //     slot.reschedule = undefined;

  //     await order.save();

  //     return {
  //       success: true,
  //       message: 'Slot rescheduled successfully',
  //       autoApproved: true,
  //     };
  //   }


  //   // 🔁 INSTRUCTOR → APPROVAL FLOW
  //   if (slot.reschedule?.status === 'PENDING') {
  //     throw new BadRequestException('Reschedule already pending');
  //   }

  //   slot.reschedule = {
  //     requestedBy: 'INSTRUCTOR',
  //     status: 'PENDING',
  //     proposedSlot: {
  //       date: dto.date,
  //       startTime: this.amPmTo24(dto.startTime),
  //       endTime: this.amPmTo24(dto.endTime),
  //     },
  //     requestedAt: new Date(),
  //   };

  //   slot.status = 'PENDING_RESCHEDULE';
  //   slot.notification = {
  //     learner: true,
  //     instructor: true,
  //   };

  //   await order.save();

  //   return {
  //     success: true,
  //     message: 'Reschedule request sent for learner approval',
  //     autoApproved: false,
  //   };
  // }
  async requestSlotReschedule(
    orderId: string,
    slotId: string,
    userId: string,
    dto: RescheduleRequestDto,
  ) {
    const order = await this.orderModel.findById(orderId);
    if (!order) throw new NotFoundException('Order not found');
  
    const slot = order.bookedSlots.find(s => String(s._id) === slotId);
    if (!slot) throw new NotFoundException('Slot not found');
  
    if (['COMPLETED', 'CANCEL', 'NOSHOW'].includes(slot.status)) {
      throw new BadRequestException('Slot cannot be rescheduled');
    }
  
    const instructorData = await this.instructorProfileModel.findOne({
      userId: new Types.ObjectId(userId),
    });
  
    const isLearner = order.learnerId.toString() === userId;
  
    /* ✅ FIXED boolean */
    const isInstructor =
      !!instructorData &&
      order.instructorId.toString() === instructorData._id.toString();
  
    if (!isLearner && !isInstructor) {
      throw new ForbiddenException();
    }
  
    /* 🕒 Use cleaner datetime builder */
    const slotStart = this.buildDateTime(slot.date, slot.startTime);
    const now = new Date();
  
    const hoursBefore =
      (slotStart.getTime() - now.getTime()) / (1000 * 60 * 60);
  
    if (hoursBefore <= 0) {
      throw new BadRequestException(
        'Cannot reschedule a past or ongoing slot',
      );
    }
  
    if (isLearner && hoursBefore < 24) {
      throw new BadRequestException(
        'Learners cannot reschedule within 24 hours of the slot',
      );
    }
  
    /* ✅ New slot validation */
    const newStartTime = this.amPmTo24(dto.startTime);
    const newEndTime = this.amPmTo24(dto.endTime);
  
    const requestedSlotStart = this.buildDateTime(dto.date, newStartTime);
  
    if (requestedSlotStart.getTime() <= Date.now()) {
      throw new BadRequestException('Requested slot must be in the future');
    }
  
    /* ===============================
       ✅ AUTO APPROVE (LEARNER ≥ 24h)
    =============================== */
    if (isLearner && hoursBefore >= 24) {
      const oldSlot = {
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        type: slot.type as 'LESSON' | 'TEST', // ✅ FIX
      };
  
      const newSlot = {
        date: dto.date,
        startTime: newStartTime,
        endTime: newEndTime,
        type: (slot.type ?? 'LESSON') as 'LESSON' | 'TEST', // ✅ SAFE
      };
  
      /* 1️⃣ Instructor profile */
      const instructorProfile = await this.instructorProfileModel.findById(
        order.instructorId,
      );
  
      if (!instructorProfile) {
        throw new NotFoundException('Instructor profile not found');
      }
  
      /* 2️⃣ Conflict validation */
      await this.validateSlotConflict(order.instructorId, newSlot);
  
      /* 3️⃣ Remove old booking */
      this.removeBookingByRange(instructorProfile, oldSlot);
  
      /* 4️⃣ Update order */
      slot.date = newSlot.date;
      slot.startTime = newSlot.startTime;
      slot.endTime = newSlot.endTime;
      slot.status = 'RESCHEDULED';
  
      /* 5️⃣ Attach new slot */
      this.attachBookingByRange(
        instructorProfile,
        newSlot,
        order._id,
      );
  
      await instructorProfile.save();
  
      /* 6️⃣ Final updates */
      slot.notification = {
        learner: true,
        instructor: true,
      };
  
      slot.reschedule = undefined;
  
      await order.save();
  
      return {
        success: true,
        message: 'Slot rescheduled successfully',
        autoApproved: true,
      };
    }
  
    /* ===============================
       🔁 INSTRUCTOR → REQUEST FLOW
    =============================== */
    if (slot.reschedule?.status === 'PENDING') {
      throw new BadRequestException('Reschedule already pending');
    }
  
    slot.reschedule = {
      requestedBy: 'INSTRUCTOR',
      status: 'PENDING',
      proposedSlot: {
        date: dto.date,
        startTime: newStartTime,
        endTime: newEndTime,
      },
      requestedAt: new Date(),
    };
  
    slot.status = 'PENDING_RESCHEDULE';
  
    slot.notification = {
      learner: true,
      instructor: true,
    };
  
    await order.save();
  
    return {
      success: true,
      message: 'Reschedule request sent for learner approval',
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







  // async createOrder(learnerId: string, dto: CreateOrderDto) {

  //   const learnerObjectId = new Types.ObjectId(learnerId);

  //   /* 1️⃣ Instructor pricing */
  //   const { instructor, pricePerHour, testPrice } =
  //     await this.instructorService.getVehiclePricing(
  //       dto.instructorId,
  //       dto.vehicleType,
  //     );

  //   /* 2️⃣ Normalize slots */
  //   const slots = this.slotService.normalizeSlots(dto.slots ?? []);

  //   const lessonSlots = slots.filter(s => s.type === 'LESSON');
  //   const testSlots = slots.filter(s => s.type === 'TEST');

  //   const lessonHours = dto.lessonHours ?? 0;

  //   /* 3️⃣ Slot duration */
  //   const lessonSlotHours = lessonSlots.reduce(
  //     (sum, slot) =>
  //       sum + this.slotService.getDuration(slot.startTime, slot.endTime),
  //     0,
  //   );

  //   const testSlotHours = testSlots.length * 2.5;
  //   const usedHours = lessonSlotHours + testSlotHours;

  //   /* 4️⃣ Validate learner */
  //   const learner = await this.learnerModel.findById(learnerObjectId);

  //   if (!learner) {
  //     throw new NotFoundException('Learner not found');
  //   }

  //   /* 5️⃣ VALIDATE SLOT CONFLICT BEFORE ANYTHING */
  //   if (slots.length > 0) {

  //     const instructorDoc = await this.instructorProfileModel.findById(
  //       instructor._id,
  //     );

  //     if (!instructorDoc) {
  //       throw new NotFoundException('Instructor not found');
  //     }

  //     for (const slot of slots) {

  //       await this.validateSlotConflict(
  //         instructor._id,
  //         slot,
  //       );

  //     }
  //   }

  //   /* 6️⃣ Lesson purchase */
  //   const lessonPurchaseAmount = lessonHours * pricePerHour;

  //   let discountPercent = 0;

  //   if (lessonHours >= 5 && lessonHours < 10) {
  //     discountPercent = 5;
  //   } else if (lessonHours >= 10) {
  //     discountPercent = 10;
  //   }

  //   const discount = (lessonPurchaseAmount * discountPercent) / 100;

  //   const discountedLessonAmount = lessonPurchaseAmount - discount;

  //   /* 7️⃣ Slot/Test booking cost */
  //   const lessonSlotAmount = lessonSlotHours * pricePerHour;
  //   const testBookingAmount = testSlots.length * testPrice;

  //   const bookingAmount = lessonSlotAmount + testBookingAmount;

  //   /* 8️⃣ Platform charge */
  //   const bookingHours = lessonSlotHours + testSlotHours;

  //   let platformCharge = 0;

  //   if (lessonHours > 0) {
  //     platformCharge += lessonHours * 2;
  //   }

  //   if (bookingHours > 0 && learner.walletBalance < bookingAmount) {
  //     platformCharge += bookingHours * 2;
  //   }

  //   const purchaseAmount = discountedLessonAmount;

  //   const subtotal = purchaseAmount + bookingAmount;

  //   const totalAmount = subtotal + platformCharge;

  //   /* 9️⃣ Wallet + Stripe split */

  //   let walletUsed = 0;
  //   let stripeAmount = totalAmount;

  //   if (lessonHours === 0) {

  //     const payment = this.paymentService.calculatePayment(
  //       purchaseAmount,
  //       bookingAmount + platformCharge,
  //       learner.walletBalance,
  //     );

  //     walletUsed = payment.walletUsed;
  //     stripeAmount = payment.stripeAmount;
  //   }

  //   const payableAmount = totalAmount - walletUsed;

  //   const bookingMode = slots.length ? 'WITH_SLOTS' : 'WITHOUT_SLOTS';

  //   const totalHours = lessonHours;

  //   const remainingHours =
  //     lessonHours > 0 ? lessonHours - lessonSlotHours : 0;

  //   /* 🔟 Create order */
  //   const order = await this.orderModel.create({

  //     learnerId: learnerObjectId,
  //     instructorId: instructor._id,

  //     vehicleType: dto.vehicleType,
  //     pricePerHour,
  //     testPrice,
  //     totalHours,
  //     usedHours,
  //     remainingHours,

  //     purchaseAmount,
  //     bookingAmount,

  //     discount,
  //     platformCharge,

  //     totalAmount,

  //     walletUsed,
  //     stripeAmount,
  //     payableAmount,

  //     bookingMode,
  //     bookedSlots: slots,

  //     paymentStatus: stripeAmount > 0 ? 'PENDING' : 'PAID',
  //     status: stripeAmount === 0 ? 'CONFIRMED' : 'PENDING_PAYMENT',
  //   });

  //   /* 1️⃣1️⃣ Attach slots if wallet fully paid */
  //   if (
  //     stripeAmount === 0 &&
  //     slots.length > 0 &&
  //     order.status === 'CONFIRMED'
  //   ) {

  //     const instructorDoc = await this.instructorProfileModel.findById(
  //       instructor._id,
  //     );

  //     if (!instructorDoc) {
  //       throw new NotFoundException('Instructor not found');
  //     }

  //     for (const slot of slots) {

  //       this.attachBookingByRange(
  //         instructorDoc,
  //         slot,
  //         order._id,
  //       );

  //     }

  //     await instructorDoc.save();
  //   }

  //   /* 1️⃣2️⃣ Debit wallet LAST */
  //   if (walletUsed > 0) {

  //     await this.walletService.debitWallet(
  //       learnerObjectId,
  //       walletUsed,
  //       WalletTxnSource.ORDER,
  //       order._id,
  //       `wallet-${order._id}`,
  //     );

  //   }

  //   return order;
  // }



  // =========================================

  async createOrder(learnerId: string, dto: CreateOrderDto) {
    const learnerObjectId = new Types.ObjectId(learnerId);

    /* 1️⃣ Instructor pricing */
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

    /* 3️⃣ Slot duration */
    const lessonSlotHours = lessonSlots.reduce(
      (sum, slot) =>
        sum + this.slotService.getDuration(slot.startTime, slot.endTime),
      0,
    );

    const testSlotHours = testSlots.length * 2.5;
    const usedHours = lessonSlotHours + testSlotHours;

    /* 4️⃣ Validate learner */
    const learner = await this.learnerModel.findById(learnerObjectId);

    if (!learner) {
      throw new NotFoundException('Learner not found');
    }

    /* 5️⃣ VALIDATE SLOT CONFLICT */
    if (slots.length > 0) {
      const instructorDoc = await this.instructorProfileModel.findById(
        instructor._id,
      );

      if (!instructorDoc) {
        throw new NotFoundException('Instructor not found');
      }

      for (const slot of slots) {
        await this.validateSlotConflict(instructor._id, slot);
      }
    }

    /* ✅ NEW: MAP SLOTS (FIX FOR LESSON PICKUP) */
    const mappedSlots = slots.map((slot) => {
      const mappedSlot: any = {
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

      if (slot.type === 'TEST') {
        mappedSlot.testLocation = slot.testLocation;
        mappedSlot.pickupPoint = slot.pickupPoint;
        mappedSlot.dropPoint = slot.dropPoint;
      }

      if (slot.type === 'LESSON') {
        mappedSlot.pickupLocation = {
          pickupAddress: slot.pickupAddress,
          suburb: slot.suburb,
          state: slot.state,
        };
      }

      return mappedSlot;
    });

    /* 6️⃣ Lesson purchase */
    const lessonPurchaseAmount = lessonHours * pricePerHour;

    let discountPercent = 0;

    if (lessonHours >= 5 && lessonHours < 10) {
      discountPercent = 5;
    } else if (lessonHours >= 10) {
      discountPercent = 10;
    }

    const discount = (lessonPurchaseAmount * discountPercent) / 100;

    const discountedLessonAmount = lessonPurchaseAmount - discount;

    /* 7️⃣ Booking cost */
    const lessonSlotAmount = lessonSlotHours * pricePerHour;
    const testBookingAmount = testSlots.length * testPrice;

    const bookingAmount = lessonSlotAmount + testBookingAmount;

    /* 8️⃣ Platform charge */
    const bookingHours = lessonSlotHours + testSlotHours;

    let platformCharge = 0;

    if (lessonHours > 0) {
      platformCharge += lessonHours * 2;
    }

    if (bookingHours > 0 && learner.walletBalance < bookingAmount) {
      platformCharge += bookingHours * 2;
    }

    const purchaseAmount = discountedLessonAmount;
    const subtotal = purchaseAmount + bookingAmount;
    const totalAmount = subtotal + platformCharge;

    /* 9️⃣ Wallet + Stripe split */
    let walletUsed = 0;
    let stripeAmount = totalAmount;

    if (lessonHours === 0) {
      const payment = this.paymentService.calculatePayment(
        purchaseAmount,
        bookingAmount + platformCharge,
        learner.walletBalance,
      );

      walletUsed = payment.walletUsed;
      stripeAmount = payment.stripeAmount;
    }

    const payableAmount = totalAmount - walletUsed;

    const bookingMode = slots.length ? 'WITH_SLOTS' : 'WITHOUT_SLOTS';
    const totalHours = lessonHours;

    const remainingHours =
      lessonHours > 0 ? lessonHours - lessonSlotHours : 0;

    /* 🔟 Create order */
    const order = await this.orderModel.create({
      learnerId: learnerObjectId,
      instructorId: instructor._id,

      vehicleType: dto.vehicleType,
      pricePerHour,
      testPrice,
      totalHours,
      usedHours,
      remainingHours,

      purchaseAmount,
      bookingAmount,

      discount,
      platformCharge,

      totalAmount,

      walletUsed,
      stripeAmount,
      payableAmount,

      bookingMode,

      /* ✅ FIX APPLIED HERE */
      bookedSlots: mappedSlots,

      paymentStatus: stripeAmount > 0 ? 'PENDING' : 'PAID',
      status: stripeAmount === 0 ? 'CONFIRMED' : 'PENDING_PAYMENT',
    });

    /* 1️⃣1️⃣ Attach slots */
    if (
      stripeAmount === 0 &&
      slots.length > 0 &&
      order.status === 'CONFIRMED'
    ) {
      const instructorDoc = await this.instructorProfileModel.findById(
        instructor._id,
      );

      if (!instructorDoc) {
        throw new NotFoundException('Instructor not found');
      }

      for (const slot of slots) {
        this.attachBookingByRange(
          instructorDoc,
          slot,
          order._id,
        );
      }

      await instructorDoc.save();
    }

    /* 1️⃣2️⃣ Debit wallet */
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


  private async validateSlotConflict(
    instructorId: Types.ObjectId,
    slot: NormalizedSlot,
  ): Promise<void> {

    const existingOrders = await this.orderModel.find({
      instructorId,
      paymentStatus: 'PAID',
      status: 'CONFIRMED',
      'bookedSlots.date': slot.date,
    });

    const reqStart = this.toMinutes(slot.startTime);
    const reqEnd = this.toMinutes(slot.endTime);

    for (const order of existingOrders) {

      for (const existingSlot of order.bookedSlots) {

        if (existingSlot.date !== slot.date) continue;

        const existingStart = this.toMinutes(existingSlot.startTime);
        const existingEnd = this.toMinutes(existingSlot.endTime);

        // ✅ Overlap formula
        if (reqStart < existingEnd && reqEnd > existingStart && existingSlot.status !== 'CANCELLED') {
          throw new BadRequestException(
            `Slot ${slot.startTime}-${slot.endTime} overlaps with existing booking ${existingSlot.startTime}-${existingSlot.endTime}`,
          );
        }
      }
    }
  }

}




