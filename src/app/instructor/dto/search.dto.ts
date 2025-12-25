import { TransmissionType } from '@constant/packages';
import { IsOptional, IsString } from 'class-validator';

export class InstructorSearchDto {
  @IsString()
  public suburbId!: string;

  @IsString()
  @IsOptional()
  public transmissionType?: TransmissionType;

  @IsOptional()
  @IsString()
  public date?: string;
}
