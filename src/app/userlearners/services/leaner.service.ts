import {
  ConflictException, Injectable, UnauthorizedException, BadRequestException,
  ForbiddenException, NotFoundException,
  forwardRef,
  Inject
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Learner, LearnerDocument } from '@common/db/schemas/learner.schema';
import { SelfLeanerRegisterDto } from '../dto/self-learner-register.dto';
import { SomeOneLeanerRegisterDto } from '../dto/someone-else-register.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';

import { ChangePasswordDto } from '../dto/change-password.dto';
import * as bcrypt from 'bcrypt';
import { InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { Logger } from 'nestjs-pino';
import { UpdateLearnerProfileDto } from '../dto/update-learner-profile.dto';
import { Order, OrderDocument } from '@common/db/schemas/order.schema';
import { NotificationService } from 'modules/notifications/notification.service';
import { PopulatedInstructor } from '@constant/instructors';
import { Request } from 'express';
import { Referral } from '@common/db/schemas/referral.schema';
import { GiftVoucherService } from '@app/gift-vouchers/services/gift-voucher-service';
@Injectable()
export class LearnerService {
  constructor(
    @InjectModel(Learner.name)
    private learnerModel: Model<LearnerDocument>,
    private jwtService: JwtService,
    private readonly logger: Logger,
    private readonly notificationService: NotificationService,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Referral.name)
    private referralModel: Model<Referral>,

    @Inject(forwardRef(() => GiftVoucherService)) // 🔥 THIS FIXES IT
  private giftVoucherService: GiftVoucherService,
    

  ) { }

  // async getOrdersForLearner(learnerId: string) {
  //   return this.orderModel
  //     .find({ learnerId: new Types.ObjectId(learnerId) })
  //     .populate({
  //       path: 'instructorId', // InstructorProfile
  //       select: 'rating vehicles reschedule',
  //       populate: {
  //         path: 'userId', // User
  //         model: 'User',
  //         select: 'firstName lastName profileImage mobileNumber',
  //       },

  //     })
  //     .sort({ createdAt: -1 })
  //     .lean();
  // }

  // async getOrdersForLearner(learnerId: string) {
  //   const orders = await this.orderModel
  //     .find({ learnerId: new Types.ObjectId(learnerId) })
  //     .populate({
  //       path: 'instructorId',
  //       select: 'rating vehicles reschedule userId',
  //       populate: {
  //         path: 'userId',
  //         model: 'User',
  //         select: 'firstName lastName profileImage mobileNumber',
  //       },
  //     })
  //     .sort({ createdAt: -1 })
  //     .lean<any[]>();
  
  //   // ✅ STEP 1: Check if ANY booked slot exists
  //   // const hasBookedSlot = orders.some(order =>
  //   //   ['CONFIRMED', 'PAID'].includes(order.status),
  //   // );

  //   const hasBookedSlot = orders.some(
  //     order => order.status === 'CONFIRMED' || order.paymentStatus === 'PAID',
  //   );
  
  //   // ✅ STEP 2: If NO booked slot → return empty list
  //   if (!hasBookedSlot) {
  //     return [];
  //   }
  
  //   // ✅ STEP 3: Process & return ALL orders
  //   return orders.map(order => {
  //     const instructor = order.instructorId;
  
  //     const vehicleType = order.vehicleType;
  
  //     if (instructor?.vehicles) {
  //       order.instructorId = {
  //         ...instructor,
  //         vehicle: instructor.vehicles[vehicleType] ?? null,
  //       };
  
  //       delete (order.instructorId as any).vehicles;
  //     }
  
  //     return order;
  //   });
  // }

  async getOrdersForLearner(learnerId: string) {
    const orders = await this.orderModel
      .find({
        learnerId: new Types.ObjectId(learnerId),
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
      })
      .populate({
        path: 'instructorId',
        select: 'rating vehicles reschedule userId',
        populate: {
          path: 'userId',
          model: 'User',
          select: 'firstName lastName profileImage mobileNumber',
        },
      })
      .sort({ createdAt: -1 })
      .lean<any[]>();
  
    // ✅ Process instructor vehicle mapping
    return orders.map(order => {
      const instructor = order.instructorId;
      const vehicleType = order.vehicleType;
  
      if (instructor?.vehicles) {
        order.instructorId = {
          ...instructor,
          vehicle: instructor.vehicles[vehicleType] ?? null,
        };
  
        delete (order.instructorId as any).vehicles;
      }
  
      return order;
    });
  }




  // async getOrdersForLearner(learnerId: string) {
  //   await this.notificationService.testMail();
  //   return this.orderModel
  //     .find({ learnerId })
  //     .populate('instructorId', 'fullName profileImage')
  //     .sort({ createdAt: -1 })
  //     .lean();
  // }

  async getLearnerBookedSlots(learnerId: string) {
    const order = await this.orderModel.findOne({ learnerId: new Types.ObjectId(learnerId) });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;

  }


  async registerSelf(
    payload: SelfLeanerRegisterDto,
    req: string,
  ) {
    return this.createLearner(payload, req);
  }


  async registerSomeOne(payload: SomeOneLeanerRegisterDto, req: string,) {
    return this.createLearner(payload, req);
  }

  private async createLearner(
    payload: any,
    referralCode?: string,
  ) {
    const hashedPassword = await bcrypt.hash(payload.password, 10);
    payload.password = hashedPassword;
    try {
      const learner = await this.learnerModel.create(payload);

      /* -----------------------------------
     🎁 AUTO GIFT VOUCHER REDEEM
  ----------------------------------- */
      await this.giftVoucherService.tryRedeemForLearner(learner);

      if (
        referralCode &&
        Types.ObjectId.isValid(referralCode)
      ) {
        const referrer = await this.learnerModel.findById(
          new Types.ObjectId(referralCode),
        );

        if (
          referrer &&
          referrer._id.toString() !== learner._id.toString()
        ) {
          await this.learnerModel.updateOne(
            { _id: learner._id },
            { referredBy: referrer._id },
          );

          await this.referralModel.create({
            referrerId: referrer._id,
            refereeId: learner._id,
            status: 'REGISTERED',
          });
        }
      }

      return {
        accessToken: this.jwtService.sign({
          sub: learner._id,
          email: learner.email,
        }),
        success: true,
        message: 'Learner created successfully',
        learner: {
          id: learner._id,
          firstName: learner.firstName,
          email: learner.email,
          mobileNumber: learner.mobileNumber,
        },
      };
    } catch (error: any) {
      if (error?.code === 11000) {
        if (error?.keyPattern?.email) {
          throw new ConflictException('Email already registered');
        }

        if (error?.keyPattern?.mobileNumber) {
          throw new ConflictException('Mobile number already registered');
        }

        throw new ConflictException('User already exists');
      }

      throw new InternalServerErrorException(error?.message);
    }

  }


  // async login(identifier: string, password: string) {
  //   const learner = await this.learnerModel.findOne({
  //     $or: [
  //       { email: identifier },
  //       { mobileNumber: identifier },
  //     ],
  //     //isActive: true,
  //   });

  //   if (!learner) {
  //     throw new UnauthorizedException('Invalid credentials');
  //   }

  //   const isPasswordValid = await bcrypt.compare(
  //     password,
  //     learner.password,
  //   );

  //   if (!isPasswordValid) {
  //     throw new UnauthorizedException('Invalid credentials');
  //   }

  //   const payload = {
  //     sub: learner._id,
  //     email: learner.email,
  //   };

  //   return {
  //     accessToken: this.jwtService.sign(payload),
  //     learner: {
  //       id: learner._id,
  //       firstName: learner.firstName,
  //       email: learner.email,
  //       mobileNumber: learner.mobileNumber,
  //     },
  //   };
  // }

  async login(identifier: string, password: string) {
    const isEmail = identifier.includes('@');
  
    const learner = await this.learnerModel.findOne({
      $or: [
        ...(isEmail
          ? [{ email: { $regex: `^${identifier}$`, $options: 'i' } }]
          : []),
        { mobileNumber: identifier },
      ],
      // isActive: true,
    });
  
    if (!learner) {
      throw new UnauthorizedException('Invalid credentials');
    }
  
    const isPasswordValid = await bcrypt.compare(
      password,
      learner.password,
    );
  
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }
  
    const payload = {
      sub: learner._id,
      email: learner.email,
    };
  
    return {
      accessToken: this.jwtService.sign(payload),
      learner: {
        id: learner._id,
        firstName: learner.firstName,
        email: learner.email,
        mobileNumber: learner.mobileNumber,
      },
    };
  }
  async changePassword(
    learnerId: string,
    payload: ChangePasswordDto,
  ) {
    const { existingPassword, newPassword, confirmPassword } = payload;

    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const learner = await this.learnerModel.findById(learnerId);

    if (!learner) {
      throw new ForbiddenException('Learner not found');
    }

    const isValid = await bcrypt.compare(
      existingPassword,
      learner.password,
    );

    if (!isValid) {
      throw new ForbiddenException('Existing password is incorrect');
    }

    learner.password = await bcrypt.hash(newPassword, 10);
    await learner.save();

    return {
      message: 'Password changed successfully',
    };
  }

  /* 1️⃣ Request reset */
  async forgotPassword(identifier: string) {
    const learner = await this.learnerModel.findOne({
      $or: [
        { email: identifier },
        { mobileNumber: identifier },
      ],
    });

    if (!learner) {
      // Do NOT reveal user existence
      return { message: 'If account exists, reset instructions sent' };
    }

    const token = crypto.randomBytes(32).toString('hex');

    learner.passwordResetToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    this.logger.log(`Password reset token for learner ${learner._id}: ${token}`);

    learner.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    await learner.save();

    // 🔔 Send token via email/SMS here
    // resetLink = `${FRONTEND_URL}/reset-password?token=${token}`

    return { message: 'If account exists, reset instructions sent' };
  }

  /* 2️⃣ Reset password */
  async resetPassword(payload: ResetPasswordDto) {
    const { token, newPassword, confirmPassword } = payload;

    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const learner = await this.learnerModel.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!learner) {
      throw new BadRequestException('Token invalid or expired');
    }

    learner.password = await bcrypt.hash(newPassword, 10);
    learner.passwordResetToken = undefined;
    learner.passwordResetExpires = undefined;

    await learner.save();

    return { message: 'Password reset successful' };
  }
  async updateProfile(
    learnerId: string,
    payload: UpdateLearnerProfileDto,
  ) {
    // Check duplicate email
    if (payload.email) {
      const emailExists = await this.learnerModel.findOne({
        email: payload.email,
        _id: { $ne: learnerId },
      });
      if (emailExists) {
        throw new ConflictException('Email already in use');
      }
    }

    // Check duplicate mobile
    if (payload.mobileNumber) {
      const mobileExists = await this.learnerModel.findOne({
        mobileNumber: payload.mobileNumber,
        _id: { $ne: learnerId },
      });
      if (mobileExists) {
        throw new ConflictException('Mobile number already in use');
      }
    }

    const learner = await this.learnerModel.findByIdAndUpdate(
      learnerId,
      {
        ...payload,
        lastUpdated: new Date(),
      },
      { new: true },
    );

    if (!learner) {
      throw new NotFoundException('Learner not found');
    }

    return {
      message: 'Profile updated successfully',
      data: learner,
    };
  }

  async getProfile(learnerId: string) {
    const learner = await this.learnerModel
      .findById(learnerId)
      .select('-password') // 🔐 never expose password
      .lean();

    if (!learner) {
      throw new NotFoundException('Learner not found');
    }

    return {
      data: learner,
    };
  }


  async getReferal(code: string) {
    const learner = this.learnerModel.findOne({ referralCode: code });
    return { learner };
  }

  async getReferralsByReferrer(learnerId: Types.ObjectId) {
    return this.referralModel
      .find({ referrerId: learnerId })
      .populate('refereeId', 'firstName email')
      .sort({ createdAt: -1 });
  }

  async findByEmailOrMobile(email?: string, mobile?: string) {
    const orConditions: any[] = [];
  
    if (email) {
      orConditions.push({ email });
    }
  
    if (mobile) {
      orConditions.push({ mobileNumber: mobile });
    }
  
    if (orConditions.length === 0) {
      return null;
    }
  
    return this.learnerModel.findOne({
      $or: orConditions,
    });
  }
  
  

}

