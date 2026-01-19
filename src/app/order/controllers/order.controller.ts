import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  Get,
  Param,
  Patch,
  BadRequestException
} from '@nestjs/common';
import { OrderService } from '../services/order.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtPayload } from '@interfaces/user.interface';
import { RescheduleRequestDto } from '../dto/reschedule-request.dto';
import { RescheduleResponseDto } from '../dto/reschedule-response.dto';
import { ActionMetaRequestDto } from '../dto/action-meta.dto';
import { FeedbackOwnerType } from '@constant/enum';

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

  @Post(':orderId/slots/:slotId/reschedule/request')
  @UseGuards(JwtAuthGuard)
  requestReschedule(
    @Param('orderId') orderId: string,
    @Param('slotId') slotId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RescheduleRequestDto,
  ) {
    
    return this.ordersService.requestSlotReschedule(orderId, slotId, user.sub, dto);
  }

  @Patch(':orderId/slots/:slotId/reschedule/respond')
  @UseGuards(JwtAuthGuard)
  respondReschedule(
    @Param('orderId') orderId: string,
    @Param('slotId') slotId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RescheduleResponseDto,
    @Param('type') type: string,
  ) {
    return this.ordersService.respondSlotReschedule(orderId, slotId, user.sub, dto.action);
  }





  // 🔴 CANCEL SLOT
  @Patch(':type/:orderId/slots/:slotId/cancel')
  cancelSlot(
    @Param('orderId') orderId: string,
    @Param('slotId') slotId: string,
    @CurrentUser() user: JwtPayload,
    @Param('type') type: string,
  ) {
    if (!Object.values(FeedbackOwnerType).includes(type as FeedbackOwnerType)) {
      throw new BadRequestException(
          'Type must be either learner or instructor',
      );
  }
    return this.ordersService.cancelSlot(
      orderId,
      slotId,
      user.sub,
      type as FeedbackOwnerType
    );
  }

  // 🔴 NO SHOW
  @Patch(':orderId/slots/:slotId/noshow')
  noShowSlot(
    @Param('orderId') orderId: string,
    @Param('slotId') slotId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ActionMetaRequestDto,
  ) {
    return this.ordersService.noShowSlot(
      orderId,
      slotId,
      user.sub,
      'INSTRUCTOR', // 'LEARNER' | 'INSTRUCTOR'
      dto
    );
  }

  // 🔴 COMPLETE SLOT
  @Patch(':orderId/slots/:slotId/complete')
  completeSlot(
    @Param('orderId') orderId: string,
    @Param('slotId') slotId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ordersService.completeSlot(orderId, slotId,user.sub);
  }


}
