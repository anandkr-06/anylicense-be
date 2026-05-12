// src/contact/contact.controller.ts

import { Body, Controller, Post } from '@nestjs/common';
import { ContactService } from '../services/contact.service';
import { ContactUsDto } from '../dto/contact-us.dto';

@Controller('contact')
export class ContactController {
  constructor(
    private readonly contactService: ContactService,
  ) {}

  @Post('submit')
  async submitContactForm(
    @Body() payload: ContactUsDto,
  ) {
    return this.contactService.submitContactForm(payload);
  }
}