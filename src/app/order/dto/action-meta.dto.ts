import {IsString} from 'class-validator';
export class ActionMetaRequestDto {
  @IsString()
  reasonType!: string;
  @IsString()
  comment?: string;
  @IsString()
  attachmentUrl?: string;
  actedAt!: Date;
  actedBy!: 'LEARNER' | 'INSTRUCTOR';
}