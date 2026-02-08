import { IsNotEmpty } from "class-validator";

export class RedeemGiftVoucherDto {
  @IsNotEmpty()
  code!: string;

  @IsNotEmpty()
  bookingId!: string; // lesson booking id
}
