import { IsNumber, IsString, Min, MinLength } from 'class-validator';

export class WithdrawDto {
  @IsNumber()
  @Min(1)
  amount!: number;
  @IsString()
  @MinLength(5)
  stripePaymentIntentId!:string
  @IsString()
  source!:string
}