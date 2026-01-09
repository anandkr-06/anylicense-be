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
  } from 'class-validator';
  import { Type } from 'class-transformer';

  export enum SlotType {
    LESSON = 'LESSON',
    TEST = 'TEST',
  }
  

  export class CreateOrderDto {
    @IsNotEmpty()
    @IsMongoId()
    instructorId!: string;
  
    @IsNotEmpty()
    @IsEnum(['auto', 'manual'])
    vehicleType!: 'auto' | 'manual';
  
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
  
    @IsOptional()
    @IsNumber()
    @Min(0)
    walletUsed?: number;
  
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
    date!: string; // YYYY-MM-DD
  
    @IsNotEmpty()
    @IsString()
    startTime!: string; // hh:mm AM/PM
  
    @IsNotEmpty()
    @IsString()
    endTime!: string;
  
    @IsNotEmpty()
    @IsEnum(SlotType) // ✅ FIX
    type!: SlotType;
  
    // pickup is required ONLY if slot exists
    @IsNotEmpty()
    @IsString()
    pickupAddress!: string;
  
    @IsNotEmpty()
    @IsString()
    suburb!: string;
  
    @IsNotEmpty()
    @IsString()
    state!: string;
  }
  
  