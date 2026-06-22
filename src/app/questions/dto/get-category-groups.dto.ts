import { IsOptional, IsString } from 'class-validator';

export class GetCategoryGroupsDto {
  @IsOptional()
  @IsString()
  vehicleType?: string;

  @IsOptional()
  @IsString()
  category?: string;
}
