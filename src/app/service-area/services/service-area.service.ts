import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserDbService } from '@common/db/services/user.db.service';

import { JwtPayload } from '@interfaces/user.interface';

import { successResponse } from '@common/helpers/response.helper';
import { ApiResponse } from '@interfaces/api-response.interfaces';
import { PackageDbService } from '@common/db/services/package.db.service';
import { Model } from 'mongoose';
import { AddServiceAreaDto } from '../dto/add-servcie-area.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Suburb, SuburbDocument } from '@common/db/schemas/suburb.schema';

@Injectable()
export class ServiceAreaServices {
  constructor(
    @InjectModel(Suburb.name)
    private readonly suburbModel: Model<SuburbDocument>,

    private readonly userDbService: UserDbService,
    private readonly packageDbService: PackageDbService,
  ) {}

  public async get(
    currentUser: JwtPayload,
  ): Promise<ApiResponse<{ serviceArea: Array<string> }>> {
    const instructor = await this.userDbService.findByPublicId(
      currentUser.publicId,
    );
    if (!instructor) {
      throw new UnauthorizedException('Instructor not found.');
    }

    return successResponse({ serviceArea: instructor.serviceArea ?? [] });
  }
  public async add(
    currentUser: JwtPayload,
    payload: AddServiceAreaDto,
  ): Promise<ApiResponse<{ serviceArea: Array<string> }>> {
    const instructor = await this.userDbService.findByPublicId(
      currentUser.publicId,
    );
    if (!instructor) {
      throw new UnauthorizedException('Instructor not found.');
    }

    if (payload.serviceArea && payload.serviceArea.length <= 0) {
      throw new UnauthorizedException('No Service Found.');
    }
    const newServiceArea = payload.serviceArea;
    const previousServiceArea = instructor.serviceArea ?? [];

    const newAreasToAdd = [];

    for (const area of newServiceArea) {
      if (!previousServiceArea.includes(area)) {
        const slot = await this.suburbModel
          .findOne({ publicId: area })
          .select({ _id: 1 })
          .exec();

        if (slot) {
          newAreasToAdd.push(area);
        }
      }
    }

    if (newAreasToAdd.length > 0) {
      instructor.serviceArea = [...previousServiceArea, ...newAreasToAdd];

      await this.userDbService.updateServiceArea(
        instructor.id,
        instructor.serviceArea,
      );
    }
    return successResponse({ serviceArea: instructor.serviceArea ?? [] });
  }

  public async remove(
    currentUser: JwtPayload,
    payload: AddServiceAreaDto,
  ): Promise<ApiResponse<{ serviceArea: Array<string> }>> {
    const instructor = await this.userDbService.findByPublicId(
      currentUser.publicId,
    );

    if (!instructor) {
      throw new UnauthorizedException('Instructor not found.');
    }

    if (!payload.serviceArea || payload.serviceArea.length === 0) {
      throw new BadRequestException('No service area provided for removal.');
    }

    const areasToRemove = payload.serviceArea;
    const previousServiceArea = instructor.serviceArea ?? [];

    const updatedServiceArea = previousServiceArea.filter(
      (area) => !areasToRemove.includes(area),
    );

    console.log(updatedServiceArea);
    // If nothing changed, do not update DB
    if (updatedServiceArea.length !== previousServiceArea.length) {
      await this.userDbService.updateServiceArea(
        instructor.id,
        updatedServiceArea,
      );
    }

    return successResponse({ serviceArea: updatedServiceArea });
  }
}
