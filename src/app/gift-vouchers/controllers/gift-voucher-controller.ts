// course.controller.ts
import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { GiftVoucherService } from '../services/gift-voucher-service';
import { CreateGiftVoucherDto } from '../dto/create-gift-voucher.dto';
import { Public } from '@common/decorators/public.decorator';

@Controller("gift-vouchers")
export class GiftVoucherController {
  constructor(private readonly voucherService: GiftVoucherService) {}
  @Public()
  @Post()
  create(@Body() dto: CreateGiftVoucherDto) {
    return this.voucherService.createVoucher(dto);
  }

  // @Public()
  // @Post("redeem")
  // redeem(@Body() dto: RedeemGiftVoucherDto) {
  //   return this.voucherService.redeemVoucher(dto);
  // }

  // @Public()
  // @Get(":code")
  // validate(@Param("code") code: string) {
  //   return this.voucherService.validateVoucher(code);
  // }
}
