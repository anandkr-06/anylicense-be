import {
  BadRequestException,
  Injectable,
  UnauthorizedException, NotFoundException
} from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { UserDbService } from '@common/db/services/user.db.service';

import { UserDocument } from '@common/db/schemas/user.schema';
import { Order,OrderDocument } from '@common/db/schemas/order.schema';
import { Learner, LearnerDocument } from '@common/db/schemas/learner.schema';
import { InstructorProfile,InstructorProfileDocument } from '@common/db/schemas/instructor-profile.schema';
import { InjectModel } from '@nestjs/mongoose';
import { CreateOrderDto } from '../dto/create-order.dto'; 
import { RequestedSlot } from '../dto/request-slot.dto';
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


  
    
  ) {}

  async createOrder(learnerId: string, dto: CreateOrderDto) {
    const instructor = await this.instructorProfileModel.findOne({
      userId: new Types.ObjectId(dto.instructorId),
    });
  
    if (!instructor) {
      throw new NotFoundException('Instructor not found');
    }
  
    const vehicle = instructor.vehicles[dto.vehicleType];
    if (!vehicle?.hasVehicle) {
      throw new BadRequestException('Vehicle not available');
    }
  
    if (dto.totalHours <= 0) {
      throw new BadRequestException('Total hours must be greater than zero');
    }
  
    // 💰 PRICE CALCULATION
    const pricePerHour = vehicle.pricePerHour ?? 0;
    const baseAmount = pricePerHour * dto.totalHours;
  
    let discountedAmount = baseAmount;
    if (dto.totalHours >= 5 && dto.totalHours < 10) {
      discountedAmount = baseAmount * 0.9;
    } else if (dto.totalHours >= 10) {
      discountedAmount = baseAmount * 0.85;
    }
  
    const finalAmount = discountedAmount + PLATFORM_CHARGE;
  
    // 🔒 SLOT VALIDATION (NO MUTATION)
    const bookedSlots = [];
    if (dto.slots?.length) {
      for (const reqSlot of dto.slots) {
        const slot = this.findSlot(instructor, reqSlot);
        if (!slot || slot.isBooked) {
          throw new BadRequestException(
            `Slot not available on ${reqSlot.date} ${reqSlot.startTime}`,
          );
        }
        bookedSlots.push(reqSlot);
      }
    }
  
    // 💳 WALLET HANDLING
    const learner = await this.learnerModel.findById(learnerId);
    if (!learner) throw new NotFoundException('Learner not found');
  
    let walletUsed = 0;
    let payableAmount = finalAmount;
    let orderStatus = 'PENDING';
    let paymentStatus: 'NOT_REQUIRED' | 'PENDING' = 'PENDING';
  
    if (learner.walletBalance > 0) {
      walletUsed = Math.min(learner.walletBalance, finalAmount);
      payableAmount = finalAmount - walletUsed;
  
      learner.walletBalance -= walletUsed;
      await learner.save();
    }
  
    if (payableAmount === 0) {
      orderStatus = 'CONFIRMED';
      paymentStatus = 'NOT_REQUIRED';
    } else {
      orderStatus = 'PENDING_PAYMENT';
      paymentStatus = 'PENDING';
    }
  
    // 🧾 CREATE ORDER
    const order = await this.orderModel.create({
      learnerId,
      instructorId: instructor.userId,
      totalHours: dto.totalHours,
      vehicleType: dto.vehicleType,
      pricePerHour,
      totalAmount: finalAmount,
      walletUsed,
      payableAmount,
      bookedSlots,
      status: orderStatus,
      paymentStatus,
      discount: baseAmount - discountedAmount,
      platformCharge: PLATFORM_CHARGE,
      coupons: dto.coupons || '',
      couponValue: dto.couponValue || 0,
    });
  
    // 🔐 LOCK SLOTS ONLY AFTER ORDER CREATION
    if (bookedSlots.length) {
      for (const slot of bookedSlots) {
        this.attachBookingId(instructor, slot, order._id);
      }
      await instructor.save();
    }
  
    return {
      success: true,
      orderId: order._id.toString(),
      totalAmount: finalAmount,
      walletUsed,
      payableAmount,
      requiresPayment: payableAmount > 0,
      message:
        payableAmount > 0
          ? 'Order created. Please complete payment.'
          : 'Order confirmed using wallet balance.',
    };
  }
  
  // async createOrder(
  //   learnerId: string,
  //   dto: CreateOrderDto,
  // ) {
  //   const instructor = await this.instructorProfileModel.findOne({userId: new Types.ObjectId(dto.instructorId)});
    
  
  //   if (!instructor) {
  //     throw new NotFoundException(`${dto.instructorId + " " +learnerId}'Instructor not found'`);
  //   }
  
  //   const vehicle = instructor.vehicles[dto.vehicleType];
  //   if (!vehicle?.hasVehicle) {
  //     throw new BadRequestException('Vehicle not available');
  //   }
  
  //   if(dto.totalHours<=0){
  //     throw new BadRequestException('Total hours must be greater than zero');
  //   }
  //   const pricePerHour = vehicle.pricePerHour ?? 0;
  //   const totalAmount = pricePerHour * dto.totalHours;
  //   const totalDiscount = (dto.totalHours>=5 && dto.totalHours<10) ? totalAmount - (totalAmount * 0.10) : (dto.totalHours>=10) ? totalAmount - (totalAmount * 0.15) : totalAmount;

  //   const totalCalculatedPrice = totalDiscount + PLATFORM_CHARGE; // Adding platform charge of $10

  
  //   /** SLOT VALIDATION (OPTIONAL) */
  //   const bookedSlots = [];

  //   if (dto.slots?.length) {
  //     for (const reqSlot of dto.slots) {
  //       const slot = this.findSlot(instructor, reqSlot);
    
  //       if (!slot || slot.isBooked) {
  //         throw new BadRequestException(
  //           `Slot not available on ${reqSlot.date} ${reqSlot.startTime}`
  //         );
  //       }
    
  //       bookedSlots.push(reqSlot); // ✅ no mutation here
  //     }
  //   }
    
  
  //   const order = await this.orderModel.create({
  //     learnerId,
  //     instructorId: instructor.userId,
  //     totalHours: dto.totalHours,
  //     vehicleType: dto.vehicleType,
  //     pricePerHour,
  //     totalAmount: totalCalculatedPrice,
  //     bookedSlots,
  //     status: 'PENDING',
  //     discount: totalAmount - totalDiscount,
  //     platformCharge: PLATFORM_CHARGE,
  //     coupons: dto.coupons || '',
  //     couponValue: dto.couponValue || 0,
  //   });
  
  //   /** Attach bookingId to slots */
  //   if (bookedSlots.length) {
  //     for (const slot of bookedSlots) {
  //       this.attachBookingId(instructor, slot, order._id);
  //     }
  //     await instructor.save();
  //   }
  //   return {orderId: order._id.toString(),
  //   totalAmount: order.totalAmount,
  //   pricePerHour: order.pricePerHour,
  //   totalHours: order.totalHours,
  // bookedSlots: order.bookedSlots,
  // success: true,
  //       message: 'Order created successfully',
  //    };
  //   //return order;
  // }
  


  private findSlot(
    instructor: InstructorProfileDocument,
    reqSlot: { date: string; startTime: string; endTime: string }
  ) {
    for (const week of instructor.availability.weeks) {
      const day = week.days.find(d => d.date === reqSlot.date);
      if (!day) continue;
  
      const slot = day.slots.find(
        s =>
          s.startTime === reqSlot.startTime &&
          s.endTime === reqSlot.endTime
      );
  
      if (slot) return slot;
    }
    return null;
  }
  

  private attachBookingId(
    instructor: InstructorProfileDocument,
    slot: {
      date: string;
      startTime: string;
      endTime: string;
    },
    orderId: Types.ObjectId,
  ) {
    for (const week of instructor.availability.weeks) {
      const day = week.days.find(d => d.date === slot.date);
      if (!day) continue;
  
      const matchedSlot = day.slots.find(
        s =>
          s.startTime === slot.startTime &&
          s.endTime === slot.endTime,
      );
  
      if (!matchedSlot || matchedSlot.isBooked) {
        throw new BadRequestException(
          `Slot ${slot.startTime}-${slot.endTime} already booked`,
        );
      }
  
      matchedSlot.isBooked = true;
      matchedSlot.bookingId = orderId;
      return;
    }
  
    throw new BadRequestException('Slot not found in availability');
  }
  private async getUser(userPublicId: string) {
    const user = await this.userDbService.findByPublicId(userPublicId);

    return user;
  }


}
