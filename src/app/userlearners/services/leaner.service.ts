import { ConflictException, Injectable, UnauthorizedException,  BadRequestException,
  ForbiddenException, NotFoundException } from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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


@Injectable()
export class LearnerService {
  constructor(
    @InjectModel(Learner.name)
    private learnerModel: Model<LearnerDocument>,
    private jwtService: JwtService,
    private readonly logger: Logger,
  ) {}
  async registerSelf(payload: SelfLeanerRegisterDto) {
    return this.createLearner(payload);
  }

  async registerSomeOne(payload: SomeOneLeanerRegisterDto) {
    return this.createLearner(payload);
  }

  private async createLearner(payload: any) {
    // Hash password
    const hashedPassword = await bcrypt.hash(payload.password, 10);
    payload.password = hashedPassword;

    try {
      return await this.learnerModel.create(payload);
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
  async login(identifier: string, password: string) {
    const learner = await this.learnerModel.findOne({
      $or: [
        { email: identifier },
        { mobileNumber: identifier },
      ],
      //isActive: true,
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

}

