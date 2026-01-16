import {IsEnum} from 'class-validator';
export class RescheduleResponseDto {
  @IsEnum(['ACCEPTED', 'REJECTED'])
  action!: 'ACCEPTED' | 'REJECTED';
}
