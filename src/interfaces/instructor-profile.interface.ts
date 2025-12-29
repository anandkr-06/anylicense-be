export type DocumentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface InstructorDocumentResponse {
  documentNumber?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  expiryCycleMonths?: number | null;
  attachment?: string | null;
  status?: DocumentStatus;
}

export interface InstructorDocumentsResponse {
  certificateOfCurrency?: InstructorDocumentResponse;
  vehicleInspectionCertificate?: InstructorDocumentResponse;
  industryAuthorityCard?: InstructorDocumentResponse;
  vehicleRegistration?: InstructorDocumentResponse;
}

export interface VehicleDetailsResponse {
  registrationNumber?: string | null;
  licenceCategory?: string | null;
  make?: string | null;
  model?: string | null;
  color?: string | null;
  year?: number | null;
  transmissionType?: 'Auto' | 'Manual' | null;
  ancapSafetyRating?: number | null;
  hasDualControls?: boolean;
}

export interface VehicleWithDetailsResponse {
  hasVehicle: boolean;
  pricePerHour?: number;
  testPricePerHour?: number;
  details?: VehicleDetailsResponse;
}

export interface PriceBlockResponse {
  pricePerHour?: number;
  testPricePerHour?: number;
}

export interface FinancialDetailsResponse {
  bankName?: string | null;
  accountHolderName?: string | null;
  accountNumber?: string | null;
  bsbNumber?: string | null;
  abnNumber?: string | null;
  businessName?: string | null;
}

export interface InstructorProfileResponse {
  id: string;
  suburbs: string[];
  availability:any

  vehicles: {
    auto?: VehicleWithDetailsResponse;
    manual?: VehicleWithDetailsResponse;
    private?: {
      hasVehicle: boolean;
      auto?: PriceBlockResponse;
      manual?: PriceBlockResponse;
    };
  };

  financialDetails?: FinancialDetailsResponse;
  rating: number;
  isVerified: boolean;
  documents?: InstructorDocumentsResponse;

  createdAt?: string;
  updatedAt?: string;
}
