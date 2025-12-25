import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ServiceAreaServices } from '../services/service-area.service';
import { JwtPayload } from '@interfaces/user.interface';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AddServiceAreaDto } from '../dto/add-servcie-area.dto';

@Controller('instructor/service-area/v1')
export class ServiceAreaController {
  constructor(private servcieAreaService: ServiceAreaServices) {}

  @Post('get')
  @HttpCode(HttpStatus.OK)
  async get(@CurrentUser() currentUser: JwtPayload) {
    return this.servcieAreaService.get(currentUser);
  }

  @Post('add')
  @HttpCode(HttpStatus.OK)
  async add(
    @CurrentUser() currentUser: JwtPayload,
    @Body() payload: AddServiceAreaDto,
  ) {
    return this.servcieAreaService.add(currentUser, payload);
  }

  @Post('remove')
  @HttpCode(HttpStatus.OK)
  async remoe(
    @CurrentUser() currentUser: JwtPayload,
    @Body() payload: AddServiceAreaDto,
  ) {
    return this.servcieAreaService.remove(currentUser, payload);
  }
}
