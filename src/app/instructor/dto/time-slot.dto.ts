import { IsString, Matches, IsDateString, IsArray,ValidateNested, IsBoolean, IsObject} from 'class-validator';
import { Types } from 'mongoose';

export class TimeSlotDto {
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  startTime!: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  endTime!: string;

  @IsBoolean()
  isBooked?: boolean = false;

  bookingId?: Types.ObjectId;
}

