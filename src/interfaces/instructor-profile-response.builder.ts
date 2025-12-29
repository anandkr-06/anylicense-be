import { InstructorProfileDocument } from '@common/db/schemas/instructor-profile.schema';
import {
  InstructorProfileResponse,
  InstructorDocumentResponse,
} from '@interfaces/instructor-profile.interface';

export class InstructorProfileResponseBuilder {
  constructor(private readonly profile: InstructorProfileDocument) {}

  static from(profile: InstructorProfileDocument): InstructorProfileResponse {
    return new InstructorProfileResponseBuilder(profile).build();
  }

  private mapDocument(doc?: any): InstructorDocumentResponse | undefined {
    if (!doc) return undefined;

    return {
      documentNumber: doc.documentNumber ?? null,
      issueDate: doc.issueDate ? new Date(doc.issueDate).toISOString() : null,
      expiryDate: doc.expiryDate ? new Date(doc.expiryDate).toISOString() : null,
      expiryCycleMonths: doc.expiryCycleMonths ?? null,
      attachment: doc.attachment ?? null,
      status: doc.status ?? 'PENDING',
    };
  }

  build(): InstructorProfileResponse {
    const { documents } = this.profile;

    return {
      id: this.profile._id.toString(),

      suburbs: this.profile.suburbs ?? [],
      availability: this.profile.availability ?? [],

      vehicles: this.profile.vehicles ?? {},

      financialDetails: this.profile.financialDetails ?? undefined,

      rating: this.profile.rating ?? 0,
      isVerified: this.profile.isVerified ?? false,

      documents: documents
        ? {
            certificateOfCurrency: this.mapDocument(
              documents.certificateOfCurrency,
            ),
            vehicleInspectionCertificate: this.mapDocument(
              documents.vehicleInspectionCertificate,
            ),
            industryAuthorityCard: this.mapDocument(
              documents.industryAuthorityCard,
            ),
            vehicleRegistration: this.mapDocument(
              documents.vehicleRegistration,
            ),
          }
        : undefined,

      
    };
  }
}
