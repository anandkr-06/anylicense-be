import { TransmissionType } from '@constant/packages';

export interface VehicleInterface {
  registrationNumber?: string;
  licenceCategory?: string;
  make?: string;
  model?: string;
  color?: string;
  year?: number;
  transmissionType: TransmissionType;
  ancapSafetyRating?: string;
  hasDualControls?: boolean;
}
