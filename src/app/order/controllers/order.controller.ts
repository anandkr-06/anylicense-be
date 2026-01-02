import {
    Body,
    Controller,
    Post,
    Req,
    UseGuards,
    Get
  } from '@nestjs/common';
  import { OrderService } from '../services/order.service';
  import { CreateOrderDto } from '../dto/create-order.dto';
  import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtPayload } from '@interfaces/user.interface';
  
  @Controller('orders')
  @UseGuards(JwtAuthGuard)
  export class OrdersController {
    constructor(private readonly ordersService: OrderService) {}
  
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
   
  }
  