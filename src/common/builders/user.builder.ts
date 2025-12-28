import { UserDocument } from '@common/db/schemas/user.schema';
import { UserResponse } from '@interfaces/user.interface';

export class UserResponseBuilder {
  private _user: UserDocument;

  constructor(user: UserDocument) {
    this._user = user;
  }

  public build(): UserResponse {
    return {
      id: this._user.publicId,
      publicId: this._user.publicId,
      email: this._user.email ?? null,
      role: this._user.role,
      description: this._user.description ?? '',
      mobileNumber: this._user.mobileNumber ?? '',
      firstName: this._user.firstName ?? '',
      lastName: this._user.lastName ?? '',
      fullName: `${this._user.firstName ?? ''} ${this._user.lastName ?? ''}`.trim(),
      initials: this.getInitials(),
  
      // address: this._user.address ?? [],
      // packages: this._user.packages ?? [],

      profileImage: this._user.profileImage ?? null,
  
      dob: this._user.dob
      ? new Date(this._user.dob).toISOString()
      : null,
      gender: this._user.gender ?? undefined,
      postcode: this._user.postCode ?? null,

  
      languagesKnown: this._user.languagesKnown ?? [],
      proficientLanguages: this._user.proficientLanguages ?? [],
      instructorExperienceYears: this._user.instructorExperienceYears ?? 0,
      isMemberOfDrivingAssociation: this._user.isMemberOfDrivingAssociation ?? false,
      transmissionType: this._user.transmissionType ?? null,
      profile: [],
    };
  }
  

  private getInitials(): string {
    const first = this._user.firstName?.[0] ?? '';
    const last = this._user.lastName?.[0] ?? '';
    return `${first}${last}`.toUpperCase();
  }
}
