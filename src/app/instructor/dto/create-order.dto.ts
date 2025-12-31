import { IsArray, IsEnum, IsMongoId, IsString } from 'class-validator';
export class CreateOrderDto {
    @IsMongoId()
    instructorId!: string;
  
    @IsEnum(['auto', 'manual', 'private'])
    vehicleType!: 'auto' | 'manual' | 'private';
  
    totalHours!: number;
  
    slots?: {
      date: string;
      startTime: string;
      endTime: string;
    }[];
  }
  