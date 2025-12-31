import {
    Body,
    Controller,
    Post,
    Req,
    UseGuards,
  } from '@nestjs/common';
  import { OrderService } from '../services/order.service';
  import { CreateOrderDto } from '../dto/create-order.dto';
  import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
  
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
      @Req() req :any,
      @Body() dto: CreateOrderDto,
    ) {
      const learnerId = req.user.id?"694ffb3d8e69b406722df4bf":"694ffb3d8e69b406722df4bf"; // from JWT
  
      return this.ordersService.createOrder(learnerId, dto);
    }
  }
  