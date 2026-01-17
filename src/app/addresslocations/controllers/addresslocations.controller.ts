import {
  Controller,
  Get,
  Query,
} from '@nestjs/common';
import { SearchPaginationDto } from '../dto/pagination.dto';


import { AddressLocationService } from '../services/addresslocation.service';
import { Public } from '@common/decorators/public.decorator';

@Public()
@Controller('testlocation/v1')
export class AddressLocationController {
  constructor(private suburbService: AddressLocationService) {}

  @Get('get_test_locations')
public getAllSuburbs(@Query() query: SearchPaginationDto) {
  return this.suburbService.getAllTestAddress(query);
}

}