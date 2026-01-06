// check-availability.dto.ts
import { Type } from 'class-transformer';
import { IsArray, IsString, ValidateNested } from 'class-validator';

// export class CheckSlotDto {
//   @IsString()
//   date!: string;

//   @IsString()
//   startTime!: string;

//   @IsString()
//   endTime!: string;

// }

// export class CheckAvailabilityDto {
//   @IsString()
//   vehicleType!: string;

//   @IsArray()
//   slots!: CheckSlotDto[];
// }


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
  @ValidateNested({ each: true })
  @Type(() => CheckSlotDto)
  slots!: CheckSlotDto[];
}
