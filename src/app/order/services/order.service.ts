import {
  BadRequestException,
  Injectable,
  UnauthorizedException, NotFoundException
} from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { UserDbService } from '@common/db/services/user.db.service';

import { UserDocument } from '@common/db/schemas/user.schema';
import { Order,OrderDocument } from '@common/db/schemas/order.schema';
import { InstructorProfile,InstructorProfileDocument } from '@common/db/schemas/instructor-profile.schema';
import { InjectModel } from '@nestjs/mongoose';
import { CreateOrderDto } from '../dto/create-order.dto'; 
import { RequestedSlot } from '../dto/request-slot.dto';
@Injectable()
export class OrderService {
  constructor(
    private readonly userDbService: UserDbService,
  
    @InjectModel(InstructorProfile.name) 
    private readonly instructorProfileModel: Model<InstructorProfileDocument>,
    @InjectModel(Order.name) 
    private readonly orderModel: Model<OrderDocument>,

  
    
  ) {}

  async createOrder(
    learnerId: string,
    dto: CreateOrderDto,
  ) {
    const instructor = await this.instructorProfileModel.findOne({userId: new Types.ObjectId(dto.instructorId)});
    
  
    if (!instructor) {
      throw new NotFoundException(`${dto.instructorId + " " +learnerId}'Instructor not found'`);
    }
  
    const vehicle = instructor.vehicles[dto.vehicleType];
    if (!vehicle?.hasVehicle) {
      throw new BadRequestException('Vehicle not available');
    }
  
    const pricePerHour = vehicle.pricePerHour ?? 0;
    const totalAmount = pricePerHour * dto.totalHours;
  
    /** SLOT VALIDATION (OPTIONAL) */
    const bookedSlots = [];

    if (dto.slots?.length) {
      for (const reqSlot of dto.slots) {
        const slot = this.findSlot(instructor, reqSlot);
    
        if (!slot || slot.isBooked) {
          throw new BadRequestException(
            `Slot not available on ${reqSlot.date} ${reqSlot.startTime}`
          );
        }
    
        bookedSlots.push(reqSlot); // ✅ no mutation here
      }
    }
    
  
    const order = await this.orderModel.create({
      learnerId,
      instructorId: instructor.userId,
      totalHours: dto.totalHours,
      vehicleType: dto.vehicleType,
      pricePerHour,
      totalAmount,
      bookedSlots,
      status: 'PENDING',
    });
  
    /** Attach bookingId to slots */
    if (bookedSlots.length) {
      for (const slot of bookedSlots) {
        this.attachBookingId(instructor, slot, order._id);
      }
      await instructor.save();
    }
    // return {orderId: order._id.toString() };
    return order;
  }
  


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
