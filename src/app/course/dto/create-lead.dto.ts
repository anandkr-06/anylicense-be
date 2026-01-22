export class CreateLeadDto {
  firstName!: string;
  lastName!: string;
  email!: string;
  phone!: string;
  userType!: 'New Learner' | 'Experienced';
  courseId!: string;
  source!: 'COURSE_EXPLORE';
  isAgreedToTermsAndConditions?: boolean;
  isAgreedToCommunicationAndOffers?: boolean;
}
