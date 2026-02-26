// import { Expose, Transform } from 'class-transformer';
// import { MaskUtil } from '../utils/mask.util';

// export class AccountResponseDto {
//   @Expose()
//   id: string;

//   @Expose()
//   @Transform(({ value }) => MaskUtil.maskAccountNumber(value))
//   accountNumber: string;

//   @Expose()
//   @Transform(({ value }) => MaskUtil.maskMobile(value))
//   mobileNumber: string;
// }