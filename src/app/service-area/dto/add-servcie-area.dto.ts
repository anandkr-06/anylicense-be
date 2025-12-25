import { IsArray, IsString } from 'class-validator';

export class AddServiceAreaDto {
  @IsArray()
  @IsString({ each: true })
  serviceArea!: string[];
}
