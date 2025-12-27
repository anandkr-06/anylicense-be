import { UserService } from '@app/users/services/user.service';
import { hashPassword } from '@common/helpers/bcrypt.helper';
import { successResponse } from '@common/helpers/response.helper';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private userService: UserService,
  ) {}

  public async login(email: string, password: string) {
    const user = await this.userService.validateUser(email, password);
    if (!user) throw new UnauthorizedException('Invalid User');

   
    const payload = {
      publicId: user.publicId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      mobileNumber: user.mobileNumber,
    };

    return successResponse({
      accessToken: this.jwtService.sign(payload),
      user: payload,
    });
  }

  public async forgetpassword(email: string) {
    const user = await this.userService.getUserByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid User');

    const resetToken = this.jwtService.sign(
      { email },
      { expiresIn: '15m', secret: process.env['JWT_SECRET'] },
    );

    /**
     * TODO: Intergrate email services
     * Todo: resetToken will send to mail,
     * In prod, we have to remove this
     */

    return successResponse(
      {
        resetToken, //  in prod, never return token; email it.
      },
      'Password reset link generated',
    );
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
