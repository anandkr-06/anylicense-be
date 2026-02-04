// course.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

import { CourseProvider } from '../schema/course-provider.schema';
import { CourseSignupDto } from '../dto/course-signup.dto';
import { CourseLoginDto } from '../dto/course-login.dto';
import { CreateCourseDto } from '../dto/create-course.dto';
import { Course } from '../schema/course.schema';
import { UpdateCourseDto } from '../dto/update-course.dto';
import { CourseListDto } from '../dto/course-list.dto';

import { NotificationService } from 'modules/notifications/notification.service';
import { courseStatus } from '@constant/enum';
import { UpdateCourseProviderProfileDto } from '../dto/update-profile.dto';
import { SmtpErrorHandlerService } from '@common/smtp/smtp-error-handler.service';
import { PinoLogger } from 'nestjs-pino';


export class CourseService {
  constructor(
    @InjectModel(CourseProvider.name)
    private readonly courseProviderModel: Model<CourseProvider>,
    @InjectModel(Course.name)
    private readonly courseModel: Model<Course>,
    private readonly jwtService: JwtService,
    //Notification Service
    private readonly notificationService: NotificationService,
    private readonly smtpErrorHandler: SmtpErrorHandlerService,
    private readonly logger: PinoLogger,
  ) { }

  async signup(dto: CourseSignupDto) {
    const exists = await this.courseProviderModel.findOne({
      $or: [{ email: dto.email }, { phone: dto.phone }],
    });
  
    if (exists) {
      throw new BadRequestException('Email or mobile already registered');
    }
  
    const hashedPassword = await bcrypt.hash(dto.password, 10);
  
    const payload = await this.courseProviderModel.create({
      ...dto,
      password: hashedPassword,
    });
  
    let emailSent = false;
  
    // try {
    //   this.notificationService.sendCourseSignUp(payload);
    
    //   emailSent = true;
    // } catch (error) {
    //   this.smtpErrorHandler.handle(error, {
    //     providerId: payload._id,
    //     source: 'course-provider-signup',
    //   })
    // }
      this.notificationService
    .sendCourseSignUp(payload)
    .catch(error =>
      this.smtpErrorHandler.handle(error, {
        providerId: payload._id,
        source: 'course-provider-signup',
      }),
    );
  
    return {
      success: true,
      message: 'Course provider registered successfully',
      emailSent, // optional
    };
  }
  
  

  async login(dto: CourseLoginDto) {
    const { identifier, password } = dto;
  
    const provider = await this.courseProviderModel.findOne({
      $or: [
        { email: identifier },
        { mobile: identifier },
      ],
    });
  
    if (!provider) {
      throw new UnauthorizedException('Invalid credentials');
    }
  
    const isMatch = await bcrypt.compare(password, provider.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }
  
    const token = this.jwtService.sign({
      sub: provider._id,
      role: 'COURSE_PROVIDER',
    });
  
    return {
      success: true,
      accessToken: token,
      provider: {
        id: provider._id,
        email: provider.email,
        phone: provider.phone,
        instituteName: provider.instituteName,
      },
    };
  }
  
  // 🔹 GET PROFILE
  async getProfile(providerId: string) {
    if (!Types.ObjectId.isValid(providerId)) {
      throw new BadRequestException('Invalid provider id'+ providerId);
    }
  
    const provider = await this.courseProviderModel
      .findById(providerId)
      .select('-password')
      .lean();
  
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }
  
    return provider;
  }

  // 🔹 UPDATE PROFILE
  async updateProfile(
    providerId: string,
    dto: UpdateCourseProviderProfileDto,
  ) {
    // Prevent email / phone duplicates
    if (dto.email || dto.phone) {
      const exists = await this.courseProviderModel.findOne({
        _id: { $ne: providerId },
        $or: [
          dto.email ? { email: dto.email } : {},
          dto.phone ? { phone: dto.phone } : {},
        ],
      });

      if (exists) {
        throw new BadRequestException(
          'Email or phone already in use',
        );
      }
    }

    const updated = await this.courseProviderModel
      .findByIdAndUpdate(
        providerId,
        { $set: dto },
        { new: true, runValidators: true },
      )
      .select('-password');

    return {
      success: true,
      message: 'Profile updated successfully',
      data: updated,
    };
  }

  async addCourse(providerId: string, dto: CreateCourseDto) {
    if (!Types.ObjectId.isValid(providerId)) {
      throw new BadRequestException('Invalid provider id');
    }
  
    // 🔴 REQUIRED: Validate schedules
    if (!dto.schedules || !Array.isArray(dto.schedules) || dto.schedules.length === 0) {
      throw new BadRequestException('At least one course schedule is required');
    }
  
    // 🔴 REQUIRED: Validate date ranges
    const schedules = dto.schedules.map((slot) => {
      const start = new Date(slot.startDateTime);
      const end = new Date(slot.endDateTime);
  
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new BadRequestException('Invalid schedule date format');
      }
  
      if (end <= start) {
        throw new BadRequestException('Schedule end time must be after start time');
      }
  
      return {
        startDateTime: start,
        endDateTime: end,
      };
    });
  
    const course = await this.courseModel.create({
      ...dto,
      schedules, // ✅ use processed schedules
      providerId: new Types.ObjectId(providerId),
      status: courseStatus.PENDING,
      isActive: false,
    });
  
    return {
      success: true,
      courseId: course._id,
      message: 'Course created successfully',
    };
  }
  

  // 📄 List courses (Provider-wise)
  async listCourses(providerId: string, query: CourseListDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const filter = {
      providerId: new Types.ObjectId(providerId),
      // isDeleted: false,
    };

    const [data, total] = await Promise.all([
      this.courseModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.courseModel.countDocuments(filter),
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

  async updateCourse(
    providerId: string,
    courseId: string,
    dto: UpdateCourseDto,
  ) {
    if (!Types.ObjectId.isValid(courseId)) {
      throw new BadRequestException('Invalid course id');
    }
  
    const updatePayload: any = { ...dto };
  
    // ✅ If schedules provided, replace them fully
    if (dto.schedules) {
      updatePayload.schedules = dto.schedules;
    }
  
    const course = await this.courseModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(courseId),
        providerId: new Types.ObjectId(providerId),
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      },
      { $set: updatePayload },
      { new: true },
    );
  
    if (!course) {
      throw new NotFoundException('Course not found or access denied');
    }
  
    return {
      success: true,
      message: 'Course updated successfully',
    };
  }
  

  // 🗑 Soft delete course
  async softDeleteCourse(providerId: string, courseId: string) {

    const course = await this.courseModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(courseId),
        providerId: new Types.ObjectId(providerId),
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
        }
      },
      { new: true },
    );


    if (!course) {
      throw new NotFoundException('Course not found or already deleted');
    }

    return {
      success: true,
      message: 'Course deleted successfully',
    };
  }
  // 🔐 Admin approval
  async approveCourse(courseId: string) {
    const course = await this.courseModel.findByIdAndUpdate(
      courseId,
      {
        status: courseStatus.APPROVED,
        isActive: true,
      },
      { new: true },
    );

    if (!course) {
      throw new BadRequestException('Course not found');
    }

    return {
      success: true,
      message: 'Course approved successfully',
    };
  }

  async rejectCourse(courseId: string, reason?: string) {
    const course = await this.courseModel.findByIdAndUpdate(
      courseId,
      {
        status: courseStatus.REJECTED,
        isActive: false,
      },
      { new: true },
    );

    if (!course) {
      throw new BadRequestException('Course not found');
    }

    return {
      success: true,
      message: 'Course rejected',
      reason,
    };
  }

  // 📋 Admin list pending courses
  async getPendingCourses() {
    return this.courseModel.find({
      status: courseStatus.PENDING,
    });
  }
}
