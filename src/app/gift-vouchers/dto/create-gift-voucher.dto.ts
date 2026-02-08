import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GiftVoucherRecipientDto } from './recipient.dto';
import { GiftVoucherSenderDto } from './sender.dto';

export class CreateGiftVoucherDto {
  @IsNumber()
  @Min(10)
  amount!: number;

  @IsIn(['EMAIL'])
  sendBy!: 'EMAIL';

  @ValidateNested()
  @Type(() => GiftVoucherRecipientDto)
  recipient!: GiftVoucherRecipientDto;

  @ValidateNested()
  @Type(() => GiftVoucherSenderDto)
  sender!: GiftVoucherSenderDto;

  @IsOptional()
  message?: string;
}
