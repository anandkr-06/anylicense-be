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
import { WalletTxnSource } from '@common/db/schemas/wallet-transaction.schema';
import { Slot, SlotDocument } from '@common/db/schemas/slot.schema';
import { RescheduleRequestDto } from '../dto/reschedule-request.dto';
import { RescheduleResponseDto } from '../dto/reschedule-response.dto';
import { ActionMetaRequestDto } from '../dto/action-meta.dto';
import { FeedbackOwnerType } from '@constant/enum';
import { calculateSlotDurationInHours, normalizeTime } from '@constant/order-actions';
import { CreatePrivateOrderDto } from '../dto/create-private-order.dto';
import { PrivateLearner } from '@common/db/schemas/private-learner.schema';
import { CreatePrivateLearnerDto } from '../dto/create-private-learner.dto';
import { UpdatePrivateLearnerDto } from '../dto/update-private-learner.dto';


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
export class PrivateLearnerService {
  constructor(
    @InjectModel(PrivateLearner.name)
    private readonly privateLearnerModel: Model<PrivateLearner>,
  ) {}

  async create(instructorId: string, dto: CreatePrivateLearnerDto) {
    return this.privateLearnerModel.create({
      ...dto,
      instructorId,
    });
  }

  async validateOwnership(
    privateLearnerId: string,
    instructorId: string,
  ) {
    const learner = await this.privateLearnerModel.findById(privateLearnerId);
    if (!learner) throw new NotFoundException('Private learner not found');

    if (learner.instructorId.toString() !== instructorId) {
      throw new ForbiddenException('Unauthorized learner access');
    }
    return learner;
  }

  // List own private learners
  async findAll(instructorId: string) {
    return this.privateLearnerModel.find({
      instructorId,
      isActive: true,
    });
  }

  // Get single private learner
  async findOne(instructorId: string, learnerId: string) {
    const learner = await this.privateLearnerModel.findById(learnerId);

    if (!learner) {
      throw new NotFoundException('Private learner not found');
    }

    if (learner.instructorId.toString() !== instructorId) {
      throw new ForbiddenException('Access denied');
    }

    return learner;
  }

  // Update private learner
  async update(
    instructorId: string,
    learnerId: string,
    dto: UpdatePrivateLearnerDto,
  ) {
    const learner = await this.findOne(instructorId, learnerId);

    Object.assign(learner, dto);
    return learner.save();
  }

  // Soft delete private learner
  async softDelete(instructorId: string, learnerId: string) {
    const learner = await this.findOne(instructorId, learnerId);

    learner.isActive = false;
    return learner.save();
  }
}





