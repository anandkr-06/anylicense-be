import { CreateAddressDto } from '@app/address/dto/create-address.dto';
import { UserRole } from '@constant/users';
import { ApiProperty } from '@nestjs/swagger';

export class UserDataDto {
  @ApiProperty({ example: 'test@gmail.com' })
  public email!: string;

  @ApiProperty({ example: '751b70a0-2cc7-47b1-89af-4a46d5d34a78' })
  public publicId!: string;

  @ApiProperty()
  public role!: UserRole;

  @ApiProperty({ example: '9999054010' })
  public mobileNumber!: string;

  @ApiProperty({ example: 'Test' })
  public firstName!: string;

  @ApiProperty({ example: 'Instructor' })
  public lastName!: string;

  @ApiProperty({ example: 'anylicense-be' })
  public fullName!: string;

  @ApiProperty({ example: 'TEST' })
  public initials!: string;

  @ApiProperty({ type: [CreateAddressDto], example: [] })
  public address!: CreateAddressDto[];
}
