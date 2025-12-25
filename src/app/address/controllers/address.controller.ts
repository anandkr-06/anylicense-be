// import { Body, Controller, Get, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import {
  Controller,
  Post,
  Param,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import { UserAddressService } from '../services/address.service';
import { CustomRequest } from '@common/types/express';
import { CreateAddressDto } from '../dto/create-address.dto';
import {
  commonSwaggerErrorResponses,
  commonSwaggerSuccess,
} from '@lib/swagger/swagger-decorator';
import { ApiBody, ApiSecurity } from '@nestjs/swagger';
import {
  mockAddressResponse,
  mockAllAddressResponse,
  mockCreateAddressRequest,
  mockCreateAddressResponse,
  mockSetPrimaryResponse,
} from '../mocks/address-mock';

@Controller('address/v1')
export class AddressController {
  constructor(private userAddressService: UserAddressService) {}

  // @HttpCode(HttpStatus.OK)
  // @Post('create')
  // @commonSwaggerErrorResponses([])
  // @ApiSecurity('jwt-auth')
  // @ApiBody({
  //   type: CreateAddressDto,
  //   description: 'Request Body',
  //   examples: {
  //     valid: {
  //       summary: 'Valid Example',
  //       value: mockCreateAddressRequest,
  //     },
  //   },
  // })
  // @commonSwaggerSuccess('Create Address', mockCreateAddressResponse)
  // public async createAddress(
  //   @Req() req: CustomRequest,
  //   @Body() payload: CreateAddressDto,
  // ) {
  //   return this.userAddressService.createAddress(req, payload);
  // }

  // @HttpCode(HttpStatus.OK)
  // @Post('get-all')
  // @commonSwaggerErrorResponses([])
  // @ApiSecurity('jwt-auth')
  // @commonSwaggerSuccess('Get All Address', mockAllAddressResponse)
  // public async getAll(@Req() req: CustomRequest) {
  //   return this.userAddressService.getAllAddress(req);
  // }

  // @Post(':id')
  // @HttpCode(HttpStatus.OK)
  // @commonSwaggerErrorResponses([])
  // @ApiSecurity('jwt-auth')
  // @commonSwaggerSuccess('Get All Address', mockAddressResponse)
  // public async getById(@Req() req: CustomRequest, @Param('id') id: string) {
  //   return this.userAddressService.getAddress(req, id);
  // }

  // @Post(':id/set-primary')
  // @HttpCode(HttpStatus.OK)
  // @ApiSecurity('jwt-auth')
  // @commonSwaggerSuccess('Set Primary Address', mockSetPrimaryResponse)
  // public async setPrimary(@Req() req: CustomRequest, @Param('id') id: string) {
  //   return this.userAddressService.setPrimary(req, id);
  // }
}
