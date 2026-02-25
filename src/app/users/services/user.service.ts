import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
 ConflictException
} from '@nestjs/common';
import { UserDbService } from '@common/db/services/user.db.service';
import { InstructorProfile, InstructorProfileDocument } from '@common/db/schemas/instructor-profile.schema';
import { RegisterUserDto } from '../dto/register-user.dto';
import { comparePassword, hashPassword } from '@common/helpers/bcrypt.helper';
import { successResponse } from '@common/helpers/response.helper';
import { UserResponse } from '@interfaces/user.interface';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

import { TransmissionType } from '@constant/packages';

import { UpdateAdditionalInfoDto } from '@app/instructor/dto/update-instructor-profile.dto';
import { UpdateVehicleDetailsDto } from '../dto/vehicle-details.dto';
import { User, UserDocument } from '@common/db/schemas/user.schema';
import { NotFoundException } from "@nestjs/common";

import { PinoLogger } from 'nestjs-pino';
import { NotificationService } from 'modules/notifications/notification.service';
import { createRandomString } from '@lib/methods';


@Injectable()
export class UserService {
  constructor(
    //Notification Service
    private readonly notificationService: NotificationService,
    private readonly userDbService: UserDbService,
    @InjectModel(InstructorProfile.name) private instructorProfileModel: Model<InstructorProfileDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly logger: PinoLogger,
  ) { this.logger.setContext(User.name); }


  public async register(dto: RegisterUserDto) {
    try {
      if (!dto.transmissionType) {
        throw new BadRequestException('transmissionType is required');
      }
      const randomString = createRandomString(10);
      const hashedPassword = await hashPassword(randomString);
      const user = await this.userDbService.createUser({
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        mobileNumber: dto.mobileNumber,
        gender: dto.gender,
        dob: dto.dob,
        description: dto.description,
        postCode: dto.postCode,
        isTncApproved: dto.isTncApproved,
        isNotificationSent: dto.isNotificationSent,
        isActive: true, // until verification
        state: dto.state,
        transmissionType: dto.transmissionType,
        password: hashedPassword,
      });
  
      const vehicles = this.buildDefaultVehicles(dto.transmissionType);
  
      await this.instructorProfileModel.create({
        userId: user._id,
        isVerified: false,
        vehicles,
      });
  
      this.notificationService.sendInstructorWelcomeEmail({
        recipientEmail: user.email,
        instructorName: user.firstName,
        password:randomString,
      }).catch(err =>
        this.logger.error(err, 'Welcome email failed'),
      );
      
  
      this.logger.info(`Instructor registered: ${user.email}`);
  
      // ✅ IMPORTANT
      return successResponse(user);
     
    } catch (error: any) {
      this.logger.error({ error }, 'User registration failed');
  
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
  




  async getProfile(instructorPublicId: string) {
    const instructor = await this.userModel
      .findById(instructorPublicId)
      .select('-password') // 🔐 never expose password
      .lean();

    if (!instructor) {
      throw new NotFoundException('Instructor not found');
    }

    const profile = await this.instructorProfileModel
      .findOne({ userId: instructor._id })
      .populate('userId')
      .exec();

    return {
      data: {

        profile: profile,
      },

    }
  }

  public async getUserByEmail(email: string): Promise<UserDocument | null> {
    const user = await this.userDbService.findByEmail(email);
    if (!user) return null;

    return user;
  }
  public async validateUser(
    email: string,
    password: string,
  ): Promise<UserDocument | null> {
    const user = await this.userDbService.findByEmail(email);
    if (!user) return null;

    const match = await comparePassword(password, user.password);
    return match ? user : null;
  }


  public async findOneAndUpdateByEmail(
    email: string,
    updateData: UserDocument | Partial<UserDocument>,
  ): Promise<UserDocument | null> {
    return this.userDbService.findOneAndUpdate(email, updateData);
  }

  public async findOneAndUpdateByAdditionalInfo(
    email: string,
    updateData: UpdateAdditionalInfoDto | Partial<UserDocument>,
  ): Promise<UserDocument | null> {
    return this.userDbService.findOneAndUpdate(email, updateData);
  }

  public async findOneAndUpdateByVehicleDetails(
    userId: string,
    updateData: UpdateVehicleDetailsDto | Partial<InstructorProfileDocument>,
  ): Promise<InstructorProfileDocument | null> {
    return this.instructorProfileModel.findOneAndUpdate({ userId }, updateData);
  }


  private async _buildUserRespons(
    user: UserDocument,
    params: Record<string, unknown> = {},
  ): Promise<UserResponse> {
    
    this.logger.debug(
      { userId: user._id },
      'Fetching instructor profile',
    );

    const profiles = await this.instructorProfileModel.find({
      userId: user._id,
    });

    this.logger.debug(
      { count: profiles.length },
      'Instructor profiles found',
    );


    return {
      id: user.publicId,
      email: user.email,
      publicId: user.publicId,
      role: user.role,
      description: user.description,
      mobileNumber: user.mobileNumber,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`,
      initials: this.getInitials(user.firstName, user.lastName),
      profileImage: null,
      dob: user.dob,
      gender: user.gender,
      postcode: user.postCode,
      languagesKnown: user.languagesKnown,
      proficientLanguages: user.proficientLanguages,
      instructorExperienceYears: user.instructorExperienceYears,
      isMemberOfDrivingAssociation: user.isMemberOfDrivingAssociation,
      transmissionType: user.transmissionType,
      profile: [],
      state: user.state,


    };
  }

  private getInitials(firstname: string, lastname?: string): string {
    const first = firstname?.[0] ?? '';
    const last = lastname?.[0] ?? '';
    return `${first}${last}`.toUpperCase();
  }

  private buildDefaultVehicles(
    transmissionType: TransmissionType,
  ) {
    const vehicles: any = {};

    // -------------------------
    // AUTO
    // -------------------------
    if (
      transmissionType === TransmissionType.AUTO ||
      transmissionType === TransmissionType.BOTH
    ) {
      vehicles.auto = {
        hasVehicle: false,
        pricePerHour: 40,
        testPricePerHour: 50,
        details: {
          registrationNumber: null,
          licenceCategory: null,
          make: null,
          model: null,
          color: null,
          year: null,
          transmissionType: 'auto',
          ancapSafetyRating: null,
          hasDualControls: false,
        },
      };
    }

    // -------------------------
    // MANUAL
    // -------------------------
    if (
      transmissionType === TransmissionType.MANUAL ||
      transmissionType === TransmissionType.BOTH
    ) {
      vehicles.manual = {
        hasVehicle: false,
        pricePerHour: 40,
        testPricePerHour: 50,
        details: {
          registrationNumber: null,
          licenceCategory: null,
          make: null,
          model: null,
          color: null,
          year: null,
          transmissionType: 'manual',
          ancapSafetyRating: null,
          hasDualControls: false,
        },
      };
    }

    // -------------------------
    // PRIVATE VEHICLES
    // -------------------------
    if (
      transmissionType === TransmissionType.AUTO ||
      transmissionType === TransmissionType.BOTH
    ) {
      vehicles.private = {
        hasVehicle: true,
        auto: {
          pricePerHour: 40,
          testPricePerHour: 50,
        },
      };
    }

    if (
      transmissionType === TransmissionType.MANUAL ||
      transmissionType === TransmissionType.BOTH
    ) {
      vehicles.private = {
        ...(vehicles.private ?? { hasVehicle: true }),
        manual: {
          pricePerHour: 40,
          testPricePerHour: 50,
        },
      };
    }

    return vehicles;
  }

}
