// course.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';

import { CourseController } from '../course/controllers/course.controller';
import { CourseService } from '../course/services/course.service';
import {
  CourseProvider,
  CourseProviderSchema,
} from '../course/schema/course-provider.schema';

import {
  Course,
  CourseSchema,
} from '../course/schema/course.schema';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CourseProvider.name, schema: CourseProviderSchema },
      { name: Course.name, schema: CourseSchema },
    ]),
    JwtModule.register({
      secret: process.env['JWT_SECRET'],
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [CourseController],
  providers: [CourseService],
})
export class CourseModule {}
