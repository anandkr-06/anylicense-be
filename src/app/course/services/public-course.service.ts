import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Course, CourseStatus } from '../schema/course.schema';
import { CreateLeadDto } from '../dto/create-lead.dto';
import { Lead } from '../schema/lead.schema';
import { CourseProvider } from '../schema/course-provider.schema';

@Injectable()
export class PublicCourseService {
  constructor(
    @InjectModel(Course.name)
    private readonly courseModel: Model<Course>,
    @InjectModel(Lead.name)
    private readonly courseLeadModel: Model<Lead>,
    @InjectModel(CourseProvider.name)
    private readonly courseProviderModel: Model<CourseProvider>,

  ) {}

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
    } = query;

    // ✅ BASE FILTER (ONLY VALID COURSES)
    const filter: any = {
    //   status: 'APPROVED',   // must exist in DB
    //   isActive: true,
    //   isDeleted: false,
    };

    // ✅ SIMPLE MATCHES
    if (category) filter.category = category;
    if (mode) filter.mode = mode;
    if (level) filter.level = level;
    if (language) filter.language = language;

    // ✅ TITLE SEARCH
    if (title) {
      filter.title = { $regex: title, $options: 'i' };
    }

    // ✅ LOCATION (EMBEDDED)
    if (city) {
      filter['location.city'] = city;
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
        .populate('providerId', 'instituteName logo')
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
        title: course.title,
        category: course.category,
        mode: course.mode,
        level: course.level,
        language: course.language,
        location: course.location.city,
        startDate: course.startDate,
        endDate: course.endDate,
        price: course.price,
      })),
    };
  }

//   async createLead(dto: CreateLeadDto) {
//     const course = await this.courseModel.findById(dto.courseId);
//     const courseProvider = await this.courseProviderModel.findById(course?.providerId);


//     if (await this.courseLeadModel.exists({ email:dto.email, courseId:dto.courseId })) {
//         return {
//             "success": true,
//             "message": "Lead submitted successfully",
//             "redirectUrl": courseProvider?.websiteUrl
//           };
//     }

//     await this.courseLeadModel.create(dto);
//     return {
//         "success": true,
//         "message": "Lead submitted successfully",
//         "redirectUrl": courseProvider?.websiteUrl
//       };
//   }
async createLead(dto: CreateLeadDto) {
    // 1️⃣ Fetch course with minimal fields
    const course = await this.courseModel
      .findOne({
        _id: dto.courseId,
        isDeleted: false,
        // isActive: true,
      })
      .select('providerId')
      .lean();
  
    if (!course) {
      throw new NotFoundException('Course not found');
    }
  
    // 2️⃣ Fetch provider website
    const provider = await this.courseProviderModel
      .findById(course.providerId)
      .select('websiteUrl')
      .lean();
  
    const redirectUrl = provider?.websiteUrl ?? null;
  
    // 3️⃣ Check duplicate lead
    const leadExists = await this.courseLeadModel.exists({
      email: dto.email,
      courseId: dto.courseId,
    });
  
    if (!leadExists) {
      await this.courseLeadModel.create({
        ...dto,
        providerId: course.providerId,
      });
    }
  
    // 4️⃣ Unified response
    return {
      success: true,
      message: 'Lead submitted successfully',
      redirectUrl,
    };
  }
  
  
}
