// check-availability.dto.ts
import { IsArray, IsString } from 'class-validator';

export class CheckSlotDto {
  @IsString()
  date!: string;

  @IsString()
  startTime!: string;

  @IsString()
  endTime!: string;

}

export class CheckAvailabilityDto {
  @IsString()
  vehicleType!: string;

  @IsArray()
  slots!: CheckSlotDto[];
}
