import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserDbService } from '@common/db/services/user.db.service';
import { createPackageDto, UpdatePackageDto } from '../dto/create-package.dto';
import { successResponse } from '@common/helpers/response.helper';
import { PackageDbService } from '@common/db/services/package.db.service';
import { JwtPayload } from '@interfaces/user.interface';
import { Package, PackageDocument } from '@common/db/schemas/package.schema';
import { isDefined } from 'class-validator';
import { Model, Types } from 'mongoose';
import { UserRole } from '@constant/users';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class PackageService {
  constructor(
    @InjectModel(Package.name)
    private readonly packageModel: Model<PackageDocument>,

    private readonly packageDbService: PackageDbService,
    private readonly userDbService: UserDbService,
  ) {}

  public async create(currentUser: JwtPayload, payload: createPackageDto) {
    const user = await this.userDbService.findByPublicId(currentUser.publicId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const packageModel = await this.packageDbService.createPackage({
      userId: user._id,
      name: payload.name,
      description: payload.description,
      transmissionType: payload.transmissionType,
      durationInHours: payload.durationInHours,
      amountPerHour: payload.amountPerHour,
    });

    return successResponse({
      package: this._buildResponse(packageModel),
    });
  }

  public async getAll(currentUser: JwtPayload) {
    const user = await this.userDbService.findByPublicId(currentUser.publicId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const allPackages = await this.packageDbService.findAll(
      new Types.ObjectId(user._id),
    );

    if (!allPackages || allPackages.length == 0) {
      return successResponse({ instructors: [] });
    }

    const buildData = allPackages.map((item) => {
      return this._buildResponse(item);
    });

    return successResponse({
      allPackages: buildData,
    });
  }

  public async getById(currentUser: JwtPayload, publicId: string) {
    const user = await this.userDbService.findByPublicId(currentUser.publicId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const model = await this.packageDbService.findByPublicId(
      publicId,
      user._id,
    );
    if (!isDefined(model)) {
      throw new UnauthorizedException('Invalid Package');
    }

    return successResponse(this._buildResponse(model));
  }

  public async update(currentUser: JwtPayload, payload: UpdatePackageDto) {
    const user = await this.userDbService.findByPublicId(currentUser.publicId);
    if (!user || user.role !== UserRole.INSTRUCTOR) {
      throw new UnauthorizedException('User not found');
    }

    const pkg = await this.packageModel
      .findOne({
        publicId: payload.id,
      })
      .exec();

    if (!pkg) {
      throw new UnauthorizedException('Package not found');
    }

    if (!pkg.isEditable) {
      throw new BadRequestException('This package price cannot be modified');
    }

    if (payload.amount < pkg.minAmount || payload.amount > pkg.maxAmount) {
      throw new BadRequestException(
        `Amount must be between ${pkg.minAmount} and ${pkg.maxAmount}`,
      );
    }
    pkg.amount = payload.amount;
    pkg.save();

    return successResponse({
      package: this._buildResponse(pkg),
    });
  }

  private _buildResponse(model: PackageDocument) {
    return {
      id: model.publicId,
      publicId: model.publicId,
      name: model.name,
      description: model.description,
      amount: model.amount,
      minAmount: model.minAmount,
      maxAmount: model.maxAmount,
      transmissionType: model.transmissionType,
      durationInHours: model.durationInHours,
      amountPerHour: model.amountPerHour,
      isActive: model.isActive,
      isEditable: model.isEditable,
    };
  }
}
