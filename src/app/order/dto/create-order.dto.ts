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
    totalHours!: number; // 5, 10, 12...

    @IsOptional()
    @IsNumber()
    @Min(1)
    coupons!: number; // coupon code value
    
    @IsOptional()
    @IsNumber()
    @Min(0)
    couponValue!: number; // coupon discount value

    @IsOptional()
    @IsNumber()
    @Min(0)
    platformCharge!: number; // platform charge value

    @IsOptional()
    @IsNumber()
    @Min(0)
    discount!: number; // discount value


    
    /** 
     * Optional slot booking
     * If not provided → instructor & learner schedule later
     */
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SlotDto)
    slots?: SlotDto[];
  }
  