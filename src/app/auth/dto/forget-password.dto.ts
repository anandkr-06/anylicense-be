import { IsEmail } from 'class-validator';

export class ForgetPasswordDto {
  @IsEmail()
  public email!: string;
}
