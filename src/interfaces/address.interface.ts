export interface AddressResponse {
  publicId: string;
  label: string;
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  isPrimary: boolean | undefined;
}
