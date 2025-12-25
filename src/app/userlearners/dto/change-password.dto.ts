import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  existingPassword!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;

  @IsString()
  @MinLength(8)
  confirmPassword!: string;
}
