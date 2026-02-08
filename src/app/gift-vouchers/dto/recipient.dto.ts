import { IsEmail, IsNotEmpty } from 'class-validator';

export class GiftVoucherRecipientDto {
  @IsNotEmpty()
  firstName!: string;

  @IsNotEmpty()
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsNotEmpty()
  phone!: string;
}
