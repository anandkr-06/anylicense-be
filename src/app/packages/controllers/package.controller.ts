import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import {
  commonSwaggerErrorResponses,
  commonSwaggerSuccess,
} from '@lib/swagger/swagger-decorator';
import { ApiBody, ApiSecurity } from '@nestjs/swagger';
import { PackageService } from '../services/package.service';
import { UpdatePackageDto } from '../dto/create-package.dto';
import { JwtPayload } from '@interfaces/user.interface';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import {
  mockGetAllResponse,
  mockPackageResponseById,
} from '../mocks/package.mock';

@Controller('package/v1')
@UseGuards(JwtAuthGuard)
export class PackageController {
  constructor(private packageService: PackageService) {}

  @Post('get-all')
  @commonSwaggerErrorResponses([])
  @ApiSecurity('jwt-auth')
  @commonSwaggerSuccess('Get Packages', mockGetAllResponse)
  async getAll(@CurrentUser() currentUser: JwtPayload) {
    return await this.packageService.getAll(currentUser);
  }

  @Post('update')
  async update(
    @CurrentUser() currentUser: JwtPayload,
    @Body() payload: UpdatePackageDto,
  ) {
    return await this.packageService.update(currentUser, payload);
  }
  @Post(':id')
  @HttpCode(HttpStatus.OK)
  @commonSwaggerErrorResponses([])
  @ApiSecurity('jwt-auth')
  @commonSwaggerSuccess('Get Package By Id', mockPackageResponseById)
  async getById(
    @CurrentUser() currentUser: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.packageService.getById(currentUser, id);
  }
}
