import {
    BadRequestException,
    Injectable,
    NotFoundException,
  } from '@nestjs/common';
  import { InjectModel } from '@nestjs/mongoose';
  import { Model, Types } from 'mongoose';
  
  import {
    InstructorProfile,
    InstructorProfileDocument,
  } from '@common/db/schemas/instructor-profile.schema';
import { VehicleType } from '@constant/enum';
  
  
  
  @Injectable()
  export class InstructorService {
    constructor(
      @InjectModel(InstructorProfile.name)
      private readonly instructorProfileModel: Model<InstructorProfileDocument>,
    ) {}
  
    async getVehiclePricing(
        instructorId: string,
        vehicleType: VehicleType,
      ) {
        const instructor = await this.instructorProfileModel.findOne({
          userId: new Types.ObjectId(instructorId),
        });
      
        if (!instructor) {
          throw new NotFoundException('Instructor not found');
        }
      
        const vehicle = instructor.vehicles?.[vehicleType];
      
        if (
          !vehicle ||
          !vehicle.hasVehicle ||
          typeof vehicle.pricePerHour !== 'number'
        ) {
          throw new BadRequestException('Vehicle pricing not configured');
        }
        return {
          instructor,
          pricePerHour: vehicle.pricePerHour,
          testPrice: vehicle.testPricePerHour ?? 0,
        };
      }
  }