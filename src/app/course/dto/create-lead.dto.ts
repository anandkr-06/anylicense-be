import { IsOptional, IsString } from 'class-validator';

export class LocationDto {
  @IsOptional()
  @IsString()
  suburb?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  postCode?: string;
}

export class CreateLeadDto {
  firstName!: string;
  lastName!: string;
  email!: string;
  phone!: string;
  userType!: 'New Learner' | 'Refresher' | 'International';
  courseId!: string;
  source!: 'COURSE_EXPLORE';

  isAgreedToTermsAndConditions?: boolean;
  isAgreedToCommunicationAndOffers?: boolean;

  @IsOptional()
  location?: LocationDto;
}
