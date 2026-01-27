import { IsMongoId, IsNotEmpty, IsNumber, Max, Min } from 'class-validator';

export class CreateInstructorReviewDto {
  @IsMongoId()
  instructorId!: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsNotEmpty()
  comment!: string;
}
