import { IsEmail, IsNotEmpty } from 'class-validator';

export class GiftVoucherSenderDto {
  @IsNotEmpty()
  firstName!: string;

  @IsNotEmpty()
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsNotEmpty()
  phone!: string;
}
