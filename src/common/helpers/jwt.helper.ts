import { JwtPayload } from '@interfaces/user.interface';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtAuthHelper {
  private readonly jwtSecret: string;
  private readonly resetSecret: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.jwtSecret = this.configService.get<string>('JWT_SECRET')!;
    this.resetSecret =
      this.configService.get<string>('JWT_RESET_SECRET') || this.jwtSecret;
  }

  // --- Normal Auth Token ---
  createToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.jwtSecret,
      expiresIn: '1h',
    });
  }

  verifyToken<T extends JwtPayload>(token: string): T {
    try {
      return this.jwtService.verify<T>(token, { secret: this.jwtSecret });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  refreshToken(
    oldToken: string,
    additionalPayload?: Partial<JwtPayload>,
  ): string {
    const payload = this.verifyToken<JwtPayload>(oldToken);
    return this.createToken({ ...payload, ...additionalPayload });
  }

  // --- Reset Password Token ---
  createResetToken(payload: { email: string }): string {
    return this.jwtService.sign(payload, {
      secret: this.resetSecret,
      expiresIn: '15m', // short lifetime
    });
  }

  verifyResetToken(token: string): { email: string } {
    try {
      return this.jwtService.verify<{ email: string }>(token, {
        secret: this.resetSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired reset token');
    }
  }
}
