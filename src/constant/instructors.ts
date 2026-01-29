export interface PopulatedInstructor {
    rating: number;
    vehicles?: any;
    userId?: {
      firstName: string;
      lastName: string;
      profileImage?: string;
      mobileNumber?: string;
    };
  }
  