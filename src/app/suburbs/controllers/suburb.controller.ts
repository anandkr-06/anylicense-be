import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { SearchPaginationDto } from '../dto/pagination.dto';


import {
  commonSwaggerErrorResponses,
  commonSwaggerSuccess,
} from '@lib/swagger/swagger-decorator';

import { SuburbService } from '../services/suburb.service';
import { Public } from '@common/decorators/public.decorator';
import { mockSuburbResponse } from '../mocks/suburb.mock';

@Public()
@Controller('suburbs/v1')
export class SuburbController {
  constructor(private suburbService: SuburbService) {}

  @Get('get_available_suburbs')
public getAllSuburbs(@Query() query: SearchPaginationDto) {
  return this.suburbService.getAllSuburbs(query);
}

}