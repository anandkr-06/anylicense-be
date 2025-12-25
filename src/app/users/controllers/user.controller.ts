import {
  Body,
  Controller,
  Get,
  ParseFilePipeBuilder,
  Post,
  Req,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from '../services/user.service';
import { RegisterUserDto } from '../dto/register-user.dto';
import { CustomRequest } from '@common/types/express';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { UserRole } from '@constant/users';
import { Public } from '@common/decorators/public.decorator';
import {
  commonSwaggerErrorResponses,
  commonSwaggerSuccess,
} from '@lib/swagger/swagger-decorator';
import { ApiBody, ApiSecurity } from '@nestjs/swagger';
import { mockLeanerData, mockUserData } from '../mocks/user.mock';
import { UserDataDto } from '../dto/user.dto';
import {
  createInstructorMock,
  createLeanerMock,
} from '../mocks/create-user.mock';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { Express } from 'express';

@Controller('users/v1')
export class UserController {
  constructor(private userService: UserService) {}

  @Public()
  @Post('register')
  @commonSwaggerErrorResponses([])
  @commonSwaggerSuccess('Add Leaner', mockLeanerData, UserDataDto)
  @ApiBody({
    type: RegisterUserDto,
    description: 'Request Body',
    examples: {
      valid: {
        summary: 'Valid Example',
        value: createLeanerMock,
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('image', {
      storage: multer.memoryStorage(), // required to access file.buffer
    }),
  )
  async register(
    @Body() body: RegisterUserDto,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /(jpg|jpeg|png)$/i, // only images allowed
        })
        .build({
          fileIsRequired: false, // 🔥 image optional
        }),
    )
    profileImage?: Express.Multer.File,
  ) {
    const payload = body;
    if (payload.address && typeof payload.address === 'string') {
      payload.address = JSON.parse(payload.address);
    }

    return this.userService.register(payload, UserRole.LEARNER, profileImage);
  }

  @Public()
  @Post('add-instructor')
  @commonSwaggerErrorResponses([])
  @commonSwaggerSuccess('Add Instructor', mockUserData, UserDataDto)
  @ApiBody({
    type: RegisterUserDto,
    description: 'Request Body',
    examples: {
      valid: {
        summary: 'Valid Example',
        value: createInstructorMock,
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('image', {
      storage: multer.memoryStorage(), // required to access file.buffer
    }),
  )
  async addInstructor(
    @Body() body: RegisterUserDto,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /(jpg|jpeg|png)$/i,
        })
        .build({
          fileIsRequired: false,
        }),
    )
    profileImage?: Express.Multer.File,
  ) {
    const payload = body;
    if (payload.address && typeof payload.address === 'string') {
      payload.address = JSON.parse(payload.address);
    }

    return this.userService.register(
      payload,
      UserRole.INSTRUCTOR,
      profileImage,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @commonSwaggerErrorResponses([])
  @ApiSecurity('jwt-auth')
  @commonSwaggerSuccess('Get Profile', mockUserData)
  async getMe(@Req() req: CustomRequest) {
    if (!req.user) {
      throw new UnauthorizedException('Token is invalid or expired');
    }
    const userId = req.user.publicId; // or whatever field you stored in JWT
    const user = await this.userService.getUserById(userId);
    return user;
  }
}
