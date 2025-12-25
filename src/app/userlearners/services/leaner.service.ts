import { ConflictException, Injectable, UnauthorizedException,  BadRequestException,
  ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Learner, LearnerDocument } from '@common/db/schemas/learner.schema';
import { SelfLeanerRegisterDto } from '../dto/self-learner-register.dto';
import { SomeOneLeanerRegisterDto } from '../dto/someone-else-register.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import * as bcrypt from 'bcrypt';
import { InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';


@Injectable()
export class LearnerService {
  constructor(
    @InjectModel(Learner.name)
    private learnerModel: Model<LearnerDocument>,
    private jwtService: JwtService,
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
}


