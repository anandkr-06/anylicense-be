// course.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';

import { CourseController } from '../course/controllers/course.controller';
import { CourseService } from '../course/services/course.service';
import { PublicCourseController } from './controllers/public-course.controller';
import { PublicCourseService } from './services/public-course.service';
import {
  CourseProvider,
  CourseProviderSchema,
} from '../course/schema/course-provider.schema';

import {
  Course,
  CourseSchema,
} from '../course/schema/course.schema';
import { Lead, LeadSchema} from './schema/lead.schema';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CourseProvider.name, schema: CourseProviderSchema },
      { name: Course.name, schema: CourseSchema },
      { name: Lead.name, schema: LeadSchema },
    ]),
    JwtModule.register({
      secret: process.env['JWT_SECRET'],
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [CourseController,PublicCourseController],
  providers: [CourseService, PublicCourseService],
})
export class CourseModule {}
