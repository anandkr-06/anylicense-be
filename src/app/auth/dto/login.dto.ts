// import { UserRole } from '@constant/users';
// import { IsEmail, IsString, MinLength } from 'class-validator';

// export class LoginDto {
//   @IsEmail()
//   public email!: string;

//   @IsString()
//   @MinLength(8)
//   public password!: string;
  
// }

import { IsNotEmpty, IsString } from 'class-validator';

export class InstructorLoginDto {
  @IsString()
  @IsNotEmpty()
  identifier!: string; // email OR mobile

  @IsString()
  @IsNotEmpty()
  password!: string;
}
