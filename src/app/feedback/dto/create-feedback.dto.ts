import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { FeedbackType } from '@constant/enum'

export class CreateFeedbackDto {
  @IsEnum(FeedbackType)
  feedbackType!: FeedbackType;

  @IsString()
  @MaxLength(1000)
  description!: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;
}
