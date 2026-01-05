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
  
  export class SlotDto {
    @IsNotEmpty()
    @IsString()
    date!: string; // YYYY-MM-DD
  
    @IsNotEmpty()
    @IsString()
    startTime!: string; // HH:mm
  
    @IsNotEmpty()
    @IsString()
    endTime!: string; // HH:mm
  
    // 🔥 PICKUP PER SLOT
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
  
  
  export class CreateOrderDto {
    @IsNotEmpty()
    @IsMongoId()
    instructorId!: string;
  
    @IsNotEmpty()
    @IsEnum(['auto', 'manual'])
    vehicleType!: 'auto' | 'manual';
  
    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    totalHours!: number;
  
    // 🔐 CALCULATED AMOUNT (validated)
    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    totalAmount!: number;
  
    // 💰 WALLET INTENT
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
  
    // 🧾 PLATFORM
    @IsOptional()
    @IsNumber()
    @Min(0)
    platformCharge?: number;
  
    @IsOptional()
    @IsNumber()
    @Min(0)
    discount?: number;
  
    /**
     * Optional slot booking
     * If absent → wallet credit + later scheduling
     */
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SlotDto)
    slots?: SlotDto[];
    learnerId: string | undefined;
  }
  
  