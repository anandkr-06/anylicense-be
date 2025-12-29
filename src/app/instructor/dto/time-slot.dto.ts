import { IsString } from 'class-validator';

export class TimeSlotDto {
  @IsString()
  from!: string; // HH:mm

  @IsString()
  to!: string;   // HH:mm
}
