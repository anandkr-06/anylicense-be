import { IsNotEmpty, IsString } from 'class-validator';

export class LearnerLoginDto {
  @IsString()
  @IsNotEmpty()
  identifier!: string; // email OR mobile

  @IsString()
  @IsNotEmpty()
  password!: string;
}
