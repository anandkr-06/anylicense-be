import { IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CourseListDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 10;
}
