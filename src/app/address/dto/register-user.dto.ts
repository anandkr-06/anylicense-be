import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class RegisterUserDto {
  @IsNotEmpty()
  public firstName!: string;

  @IsNotEmpty()
  public lastName?: string;

  @IsEmail()
  public email!: string;

  @IsNotEmpty()
  @MinLength(8)
  public password!: string;

  @IsNotEmpty()
  public mobileNumber!: string;
}
