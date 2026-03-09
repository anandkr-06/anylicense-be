import {
    IsArray,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    IsMongoId,
    ValidateNested,
    Min,
    ValidateIf,
  
  } from 'class-validator';
  import { Type } from 'class-transformer';
import { DropPointDto, PickupPointDto } from './location.dto';
import { VehicleType } from '@constant/enum';



  export enum SlotType {
    LESSON = 'LESSON',
    TEST = 'TEST',
  }
  

  export class CreateOrderDto {
    @IsNotEmpty()
    @IsMongoId()
    instructorId!: string;
  
    @IsNotEmpty()
    @IsEnum(VehicleType)
vehicleType!: VehicleType;
  
    /**
     * LESSON HOURS (optional)
     * Required only if lesson is booked
     */
    @IsOptional()
    @IsNumber()
    @Min(1)
    lessonHours?: number;
  
    /**
     * TEST COUNT (optional)
     * Each test = 2.5 hours
     */
    @IsOptional()
    @IsNumber()
    @Min(1)
    testCount?: number;
  
    /**
     * Slots for BOTH lesson & test
     * Slot.type decides usage
     */
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SlotDto)
    slots?: SlotDto[];
  
    // 💰 WALLET
    @IsOptional()
    useWallet?: boolean;
  
  
    // 🎟 COUPON
    @IsOptional()
    @IsString()
    couponCode?: string;
  
    @IsOptional()
    @IsNumber()
    @Min(0)
    couponValue?: number;
  }
  
  export class SlotDto {
    @IsNotEmpty()
    @IsString()
    date!: string;
  
    @IsNotEmpty()
    @IsString()
    startTime!: string;
  
    @IsNotEmpty()
    @IsString()
    endTime!: string;
  
    @IsNotEmpty()
    @IsEnum(SlotType)
    type!: SlotType;
  
    /* ------------------ LESSON FIELDS ------------------ */
    @ValidateIf((o) => o.type === SlotType.LESSON)
    @IsNotEmpty()
    @IsString()
    pickupAddress!: string;
  
    @ValidateIf((o) => o.type === SlotType.LESSON)
    @IsNotEmpty()
    @IsString()
    suburb!: string;
  
    @ValidateIf((o) => o.type === SlotType.LESSON)
    @IsNotEmpty()
    @IsString()
    state!: string;
  
    /* ------------------ TEST FIELDS ------------------ */
    @ValidateIf((o) => o.type === SlotType.TEST)
    @IsNotEmpty()
    @IsString()
    testLocation!: string;
  
    @ValidateIf((o) => o.type === SlotType.TEST)
    @ValidateNested()
    @Type(() => PickupPointDto)
    pickupPoint!: PickupPointDto;
  
    @ValidateIf((o) => o.type === SlotType.TEST)
    @ValidateNested()
    @Type(() => DropPointDto)
    dropPoint!: DropPointDto;
  }