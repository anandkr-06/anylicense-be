import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TestLocationDto } from './testlocation.dto';

export class UpdateTestLocationsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TestLocationDto)
  testLocations!: TestLocationDto[];
}
