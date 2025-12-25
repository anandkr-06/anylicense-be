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
      email: this._user.email,
      publicId: this._user.publicId,
      role: this._user.role,
      subject: this._user.subject,
      description: this._user.description,
      mobileNumber: this._user.mobileNumber,
      firstName: this._user.firstName,
      lastName: this._user.lastName,
      fullName: `${this._user.firstName} ${this._user.lastName}`,
      initials: this.getInitials(),
      address: [],
    };
  }

  private getInitials(): string {
    const first = this._user.firstName?.[0] ?? '';
    const last = this._user.lastName?.[0] ?? '';
    return `${first}${last}`.toUpperCase();
  }
}
