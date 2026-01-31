import { IsMongoId } from 'class-validator';

export class ReviewExistsDto {
  @IsMongoId()
  instructorId!: string;

  @IsMongoId()
  learnerId!: string;

  @IsMongoId()
  orderId!: string;

  @IsMongoId()
  slotId!: string;
}
