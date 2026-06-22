import { IsOptional, IsString } from 'class-validator';

export class GetCategoryGroupsDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  category?: string;
}
