// src/contact/dto/contact-us.dto.ts

import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
const inquiryOptions = [
  "I’m a learner looking for driving lessons",
  "I’m an instructor using AnyLicence",
  "I want to join AnyLicence as an instructor",
  "I have a partnership enquiry",
];

export class ContactUsDto {
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsString()
  @IsNotEmpty()
  inquiryType!: string;

  @IsString()
  message!: string;
}