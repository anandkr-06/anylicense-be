import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ServiceAreaDto } from './service-area.dto';

export class UpdateServiceAreasDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceAreaDto)
  serviceAreas!: ServiceAreaDto[];
}
