import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  Get,
  Param,
  Patch
} from '@nestjs/common';
import { OrderService } from '../services/order.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtPayload } from '@interfaces/user.interface';
import { RescheduleRequestDto } from '../dto/reschedule-request.dto';
import { RescheduleResponseDto } from '../dto/reschedule-response.dto';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrderService) { }

  /**
   * Create driving lesson order
   * Learner books hours (slots optional)
   */
  @Post('create')
  async createOrder(
    @Req() @CurrentUser() currentUser: JwtPayload,
    @Body() dto: CreateOrderDto,
  ) {
    const learnerId = currentUser.sub; // from JWT

    return this.ordersService.createOrder(learnerId, dto);
  }

  @Post(':orderId/reschedule/request')
  @UseGuards(JwtAuthGuard)
  requestReschedule(
    @Param('orderId') orderId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RescheduleRequestDto,
  ) {
    return this.ordersService.requestReschedule(orderId, user.sub, dto);
  }

  @Patch(':orderId/reschedule/respond')
  @UseGuards(JwtAuthGuard)
  respondReschedule(
    @Param('orderId') orderId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RescheduleResponseDto,
  ) {
    return this.ordersService.respondReschedule(orderId, user.sub, dto.action);
  }


}
