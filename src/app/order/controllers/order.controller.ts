import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  Get,
  Param,
  Patch,
  BadRequestException,
  RawBody,
  Headers,
  Query
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
import { CreatePrivateOrderDto } from '../dto/create-private-order.dto';
import { CreatePrivateLearnerDto } from '../dto/create-private-learner.dto';
import { PrivateLearnerService } from '../services/private-order.service';
import { CancelPrivateOrderResponseDto } from '../dto/cancel-private-order.response.dto';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrderService
    , private readonly privateLearnerService: PrivateLearnerService
  ) { }

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

  // Create Private Learner
  @Post('private-learners')
  createPrivateLearner(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreatePrivateLearnerDto,
  ) {
    return this.privateLearnerService.create(user.sub, dto);
  }

  // Book Private Slot / Test
  // @Post('private-booking')
  // createPrivateBooking(
  //   @CurrentUser() user: JwtPayload,
  //   @Body() dto: CreatePrivateOrderDto,
  // ) {
  //   return this.ordersService.createPrivateOrder(user.sub, dto);
  // }
  @Post('private-booking')
  createPrivateBooking(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreatePrivateOrderDto,
  ) {
    return this.ordersService.createPrivateOrder(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
@Get('private-orders')
async getPrivateOrders(
  @CurrentUser() user: JwtPayload,   // ✅ required first
  @Query('page') page = 1,
  @Query('limit') limit = 10,
  @Query('status') status?: string,  // ✅ optional last
) {
  return this.ordersService.getInstructorPrivateOrders({
    instructorId: user.sub,
    page: Number(page),
    limit: Number(limit),
    status,
  });
}

@UseGuards(JwtAuthGuard)
@Get('private-orders/:orderId')
async getPrivateOrderDetails(
  @CurrentUser() user: JwtPayload,
  @Param('orderId') orderId: string,
) {
  return this.ordersService.getInstructorPrivateOrderDetails(
    user.sub,
    orderId,
  );
}

@Post('private-orders/:id/cancel')
async cancelPrivateOrder(
  @Param('id') orderId: string,
  @CurrentUser() user: JwtPayload,
): Promise<CancelPrivateOrderResponseDto> {
  return this.ordersService.cancelPrivateOrder(
    user.sub,
    orderId,
  );
}

@Get("upcoming-stats")
async getDashboardStats(
  @CurrentUser() user: JwtPayload,
) {
  const instructorId = user.sub;

  return this.ordersService.getUpcomingStats(instructorId);
}

@Get("pending-payout")
async getPendingPayout(
  @CurrentUser() user: JwtPayload,  
) {
  const instructorId = user.sub;
  return this.ordersService.getPendingPayout(instructorId);
}

}
