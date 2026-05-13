// src/contact/contact.controller.ts

import { Body, Controller, Post } from '@nestjs/common';
import { ContactService } from '../services/contact.service';
import { ContactUsDto } from '../dto/contact-us.dto';
import { Public } from '@common/decorators/public.decorator';


@Controller('contact')
export class ContactController {
  constructor(
    private readonly contactService: ContactService,
  ) {}
  @Public()
  @Post('submit')
  async submitContactForm(
    @Body() payload: ContactUsDto,
  ) {
    return this.contactService.submitContactForm(payload);
  }
}