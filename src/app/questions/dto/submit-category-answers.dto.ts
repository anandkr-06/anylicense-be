import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';

export class SubmittedAnswerDto {
  @IsMongoId()
  questionId!: string;

  @IsNotEmpty()
  answer!: string | number;
}

export class SubmitCategoryAnswersDto {
  @IsString()
  @IsNotEmpty()
  category!: string;
  
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SubmittedAnswerDto)
  answers!: SubmittedAnswerDto[];
}
