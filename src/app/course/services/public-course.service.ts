import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Course } from '../schema/course.schema';
import { CreateLeadDto } from '../dto/create-lead.dto';
import { Lead } from '../schema/lead.schema';
import { CourseProvider } from '../schema/course-provider.schema';
import { NotificationService } from 'modules/notifications/notification.service';
import { SmtpErrorHandlerService } from '@common/smtp/smtp-error-handler.service';
import { PinoLogger } from 'nestjs-pino';
import { courseType } from '@constant/enum';
import { verifyCaptcha } from 'utils/google-captcha';

@Injectable()
export class PublicCourseService {
  constructor(
    @InjectModel(Course.name)
    private readonly courseModel: Model<Course>,
    @InjectModel(Lead.name)
    private readonly courseLeadModel: Model<Lead>,
    @InjectModel(CourseProvider.name)
    private readonly courseProviderModel: Model<CourseProvider>,
    private readonly notificationService: NotificationService,
        private readonly smtpErrorHandler: SmtpErrorHandlerService,
        private readonly logger: PinoLogger,

  ) { }

  async getCourseFilters() {

    const suburb = await this.courseModel.distinct('location.suburb');
    const state = await this.courseModel.distinct('location.state');
    const category = await this.courseModel.distinct('category');
    const courseName = await this.courseModel.distinct('courseName');

    return {
      state,
      suburb,
      category,
      courseName
    };

  }
  async getCourses(query: any) {
    const {
      category,
      title,
      mode,
      level,
      language,
      city,
      minPrice,
      maxPrice,
      page = 1,
      limit = 10,
      location,
      courseName,
      state,
    } = query;



    // ✅ BASE FILTER (ONLY VALID COURSES)
    const filter: any = {
        status: 'APPROVED',   // must exist in DB
        // isActive: true,
        // isDeleted: false,
    };

    // ✅ SIMPLE MATCHES
    if (category) filter.category = category;
    if (location) filter["location.suburb"] = location;
    if (courseName) filter.courseName = courseName;
    if (state) filter["location.state"] = state;
    if (mode) filter.mode = mode;
    if (level) filter.level = level;
    if (language) filter.language = language;

    // ✅ TITLE SEARCH
    if (title) {
      filter.title = { $regex: title, $options: 'i' };
    }

    // ✅ LOCATION (EMBEDDED)
    if (city) {
      filter['location'] = city;
    }

    // ✅ PRICE RANGE
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
  
    const skip = (Number(page) - 1) * Number(limit);

    const [data, total] = await Promise.all([
      this.courseModel
        .find(filter)
        .populate('providerId', 'instituteName logoUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),

      this.courseModel.countDocuments(filter),
    ]);

    return {
      success: true,
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
      data: data.map((course: any) => ({
        id: course._id,
        providerName: course.providerId?.instituteName,
        logoUrl: course.providerId?.logoUrl,
        courseName: course.courseName,
        category: course.category,
        courseType: course.courseType,
        location: course.location,
        schedules: course.schedules,
        price: course.price,
        seats: course.seats,
        createdAt:course.createdAt
      })),
    };
  }

  // async createLead(dto: CreateLeadDto) {
  //   const course = await this.courseModel
  // .findOne({
  //   _id: new Types.ObjectId(dto.courseId),
  //   isDeleted: false,
  // })
  // .select('providerId') // only select what exists in Course
  // .populate({
  //   path: 'providerId',
  //   select: 'instituteName email', // fields from CourseProvider
  // })
  // .lean();

  //     this.logger.info('Lead course.'+JSON.stringify(course));
  //   if (!course) {
  //     throw new NotFoundException('Course not found');
  //   }

  //   // 2️⃣ Fetch provider website
  //   const courseData = await this.courseModel
  //     .findById(dto.courseId)
  //     .select('url')
  //     .lean();

  //   const redirectUrl = courseData?.url ?? null;

  //   // 3️⃣ Check duplicate lead
  //   const leadExists = await this.courseLeadModel.exists({
  //     email: dto.email,
  //     courseId: new Types.ObjectId(dto.courseId), // ✅ FIX
  //   });

  //   if (!leadExists) {
  //     const payload = await this.courseLeadModel.create({
  //       firstName: dto.firstName,
  //       email: dto.email,
  //       lastName: dto.lastName,
  //       phone: dto.phone,
  //       userType: dto.userType,
  //       courseId: new Types.ObjectId(dto.courseId), // ✅ FIX
  //       source: dto.source,
  //       location: dto.location,
  //       isAgreedToTermsAndConditions: dto.isAgreedToTermsAndConditions,
  //       isAgreedToCommunicationAndOffers: dto.isAgreedToCommunicationAndOffers,

  //     });
  //     this.logger.info('customer payload details:'+JSON.stringify(payload));
  //     this.notificationService
  //     .sendCourseLeadCustomer(payload)
  //     .catch(error =>
  //       this.smtpErrorHandler.handle(error, {
  //         providerId: payload._id,
  //         source: 'lead-customer',
  //       }),
  //     );
      
  //     this.logger.info('Provider.'+JSON.stringify(course.providerId));
  //     this.notificationService
  //     .sendCourseLeadProvider(payload, course.providerId)
  //     .catch(error =>
  //       this.smtpErrorHandler.handle(error, {
  //         providerId: payload._id,
  //         source: 'lead-provider',
  //       }),
  //     );
  //   }

  //   // 4️⃣ Unified response
  //   return {
  //     success: true,
  //     message: 'Lead submitted successfully',
  //     redirectUrl,
  //   };
  // }
  async createLead(dto: CreateLeadDto) {
    const { captchaToken, ...rest } = dto;
  
    // ✅ Step 1: CAPTCHA validation FIRST
    const captchaRes = await verifyCaptcha(captchaToken);
  
    if (!captchaRes.success) {
      throw new BadRequestException('Captcha verification failed');
    }
  
    if (captchaRes.score !== undefined && captchaRes.score < 0.5) {
      throw new BadRequestException('Suspicious activity detected');
    }
  
    // ✅ Step 2: Fetch course + provider
    const course = await this.courseModel
      .findOne({
        _id: new Types.ObjectId(rest.courseId),
        isDeleted: false,
      })
      .select('providerId')
      .populate({
        path: 'providerId',
        select: 'instituteName email',
      })
      .lean();
  
    this.logger.info('Lead course.' + JSON.stringify(course));
  
    if (!course) {
      throw new NotFoundException('Course not found');
    }
  
    // ✅ Step 3: Fetch redirect URL
    const courseData = await this.courseModel
      .findById(rest.courseId)
      .select('url')
      .lean();
  
    const redirectUrl = courseData?.url ?? null;
  
    // ✅ Step 4: Check duplicate lead
    const leadExists = await this.courseLeadModel.exists({
      email: rest.email,
      courseId: new Types.ObjectId(rest.courseId),
    });
  
    if (!leadExists) {
      const payload = await this.courseLeadModel.create({
        firstName: rest.firstName,
        email: rest.email,
        lastName: rest.lastName,
        phone: rest.phone,
        userType: rest.userType,
        courseId: new Types.ObjectId(rest.courseId),
        source: rest.source,
        location: rest.location,
        isAgreedToTermsAndConditions: rest.isAgreedToTermsAndConditions,
        isAgreedToCommunicationAndOffers: rest.isAgreedToCommunicationAndOffers,
      });
  
      this.logger.info(
        'customer payload details:' + JSON.stringify(payload),
      );
  
      // ✅ Customer email
      this.notificationService
        .sendCourseLeadCustomer(payload)
        .catch(error =>
          this.smtpErrorHandler.handle(error, {
            providerId: payload._id,
            source: 'lead-customer',
          }),
        );
  
      // ✅ Provider email
      this.notificationService
        .sendCourseLeadProvider(payload, course.providerId)
        .catch(error =>
          this.smtpErrorHandler.handle(error, {
            providerId: payload._id,
            source: 'lead-provider',
          }),
        );
    }
  
    // ✅ Step 5: Response
    return {
      success: true,
      message: 'Lead submitted successfully',
      redirectUrl,
    };
  }
}
