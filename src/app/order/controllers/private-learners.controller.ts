// private-learners.controller.ts
import {
    Controller,
    Get,
    Put,
    Delete,
    Param,
    Body,
    UseGuards,
  } from '@nestjs/common';
import { PrivateLearnerService } from '../services/private-order.service';
import { UpdatePrivateLearnerDto } from '../dto/update-private-learner.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtPayload } from '@interfaces/user.interface';
  import { UserRole } from 'constant';
  
import { RolesGuard } from '@app/auth/roles.guard';
import { Roles } from '@app/auth/roles.decorator';
  
  @Controller('instructor/private-learners')
  @UseGuards(JwtAuthGuard, RolesGuard)
  //@Roles(UserRole.INSTRUCTOR)
  export class PrivateLearnersController {
    constructor(
      private readonly privateLearnerService: PrivateLearnerService,
    ) {}
  
    // GET /instructor/private-learners
    @Get()
    findAll(@CurrentUser() user: JwtPayload) {
      return this.privateLearnerService.findAll(user.sub);
    }
  
    // GET /instructor/private-learners/:id
    @Get(':id')
    findOne(
      @CurrentUser() user: JwtPayload,
      @Param('id') id: string,
    ) {
      return this.privateLearnerService.findOne(user.sub, id);
    }
  
    // PUT /instructor/private-learners/:id
    @Put(':id')
    update(
      @CurrentUser() user: JwtPayload,
      @Param('id') id: string,
      @Body() dto: UpdatePrivateLearnerDto,
    ) {
      return this.privateLearnerService.update(user.sub, id, dto);
    }
  
    // DELETE /instructor/private-learners/:id (Soft delete)
    @Delete(':id')
    remove(
      @CurrentUser() user: JwtPayload,
      @Param('id') id: string,
    ) {
      return this.privateLearnerService.softDelete(user.sub, id);
    }
  }
  