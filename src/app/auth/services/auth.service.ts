import { UserService } from '@app/users/services/user.service';
import { User, UserDocument } from '@common/db/schemas/user.schema';
import { hashPassword } from '@common/helpers/bcrypt.helper';
import { successResponse } from '@common/helpers/response.helper';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { MAILER_TEMPLATES } from 'modules/email/email.constants';
import { NotificationService } from 'modules/notifications/notification.service';
import { UserRole } from '@constant/users';
@Injectable()
export class AuthService {
  // constructor(
  //   private jwtService: JwtService,
  //   private userService: UserService,
  //   //@InjectModel(User.name)
  //       private learnerModel: Model<UserDocument>,
  // ) {}

  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly notificationService: NotificationService,
  ) {}

  // public async login(email: string, password: string) {
  //   const user = await this.userService.validateUser(email, password);
  //   if (!user) throw new UnauthorizedException('Invalid User');

   
  //   const payload = {
  //     publicId: user.publicId,
  //     firstName: user.firstName,
  //     lastName: user.lastName,
  //     email: user.email,
  //     role: user.role,
  //     mobileNumber: user.mobileNumber,
  //   };

  //   return successResponse({
  //     accessToken: this.jwtService.sign(payload),
  //     user: payload,
  //   });
  // }

  async login(identifier: string, password: string) {
      const instructor = await this.userModel.findOne({
        $or: [
          { email: identifier },
          { mobileNumber: identifier },
        ],
        isActive: true,
      });
  
      if (!instructor) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const isPasswordValid = await bcrypt.compare(
        password,
        instructor.password,
      );
  
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }
  
      const payload = {
        sub: instructor._id,
        email: instructor.email,
        role:UserRole.INSTRUCTOR,
      };
  
      return {
        accessToken: this.jwtService.sign(payload),
        instructor: {
          id: instructor._id,
          firstName: instructor.firstName,
          email: instructor.email,
          mobileNumber: instructor.mobileNumber,
        },
      };
    } 
  // async login(identifier: string, password: string) {
  //   const isEmail = identifier.includes('@');
  
  //   const instructor = await this.userModel.findOne({
  //     $or: [
  //       ...(isEmail
  //         ? [{ email: { $regex: `^${identifier}$`, $options: 'i' } }]
  //         : []),
  //       { mobileNumber: identifier },
  //     ],
  //     isActive: true,
  //   });
  
  //   if (!instructor) {
  //     throw new UnauthorizedException('Invalid credentials');
  //   }
  
  //   const isPasswordValid = await bcrypt.compare(
  //     password,
  //     instructor.password,
  //   );
  
  //   if (!isPasswordValid) {
  //     throw new UnauthorizedException('Invalid credentials');
  //   }
  
  //   const payload = {
  //     sub: instructor._id,
  //     email: instructor.email,
  //   };
  
  //   return {
  //     accessToken: this.jwtService.sign(payload),
  //     instructor: {
  //       id: instructor._id,
  //       firstName: instructor.firstName,
  //       email: instructor.email,
  //       mobileNumber: instructor.mobileNumber,
  //     },
  //   };
  // } 

  // public async forgetpassword(email: string) {
  //   const user = await this.userService.getUserByEmail(email);
  //   if (!user) throw new UnauthorizedException('Invalid User');

  //   const resetToken = this.jwtService.sign(
  //     { email },
  //     { expiresIn: '15m', secret: process.env['JWT_SECRET'] },
  //   );

  //   return successResponse(
  //     {
  //       resetToken, //  in prod, never return token; email it.
  //     },
  //     'Password reset link generated',
  //   );
  // }

  public async forgetpassword(email: string) {
    const user = await this.userService.getUserByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid User');
  
    const resetToken = this.jwtService.sign(
      { email },
      { expiresIn: '15m', secret: process.env['JWT_SECRET'] },
    );
  
    const resetLink = `${process.env['FRONTEND_URL']}/reset-password?token=${resetToken}&email=${user.email}&role=instructor`;
  
    try {
      await this.notificationService.sendForgotPassword({
        recipientEmail: user.email,
        instructorName: user.firstName,
        resetLink: resetLink,
      });
    } catch (error) {
      console.error('Learner email failed:', error);
    }
  
    return successResponse({}, 'Password reset email sent successfully');
  }

  public async resetPassword(token: string, newPassword: string) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env['JWT_SECRET'],
      });

      const user = await this.userService.getUserByEmail(payload.email);

      if (!user) throw new BadRequestException('Invalid user');

      const hashedPassword = await hashPassword(newPassword);

      await this.userService.findOneAndUpdateByEmail(user.email, {
        password: hashedPassword,
      });

      return successResponse();
    } catch {
      throw new BadRequestException('Invalid or expired token');
    }
  }
}
