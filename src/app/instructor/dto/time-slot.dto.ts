import { IsString, Matches, IsDateString, IsArray,ValidateNested, IsBoolean, IsObject} from 'class-validator';
import { Types } from 'mongoose';

export class TimeSlotDto {
  @IsString()
  @Matches(
    /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i,
    { message: 'Time must be in hh:mm AM/PM format' },
  )
  startTime!: string;

  @IsString()
  @Matches(
    /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i,
    { message: 'Time must be in hh:mm AM/PM format' },
  )
  endTime!: string;

  @IsBoolean()
  isBooked?: boolean = false;

  bookingId?: Types.ObjectId;
 
  // @IsString()
  // pickupAddress?: string;

  // @IsString()
  // suburb?: string;

  // @IsString()
  // state?: string;
}

