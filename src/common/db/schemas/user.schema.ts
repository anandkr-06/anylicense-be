import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  TransmissionType,
  UserGender,
  UserRegistrationType,
  UserRole,
} from 'constant';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Types } from 'mongoose';
import { FinancialDetailInterface } from '@interfaces/financial-detail.interface';
import { VehicleInterface } from '@interfaces/vehicle.interface';

/**
 * FIXME: isActive need to be dfeeult fasle
 * - for temp. we do it for true
 */
@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ default: () => uuidv4(), unique: true })
  public publicId!: string;

  @Prop({ required: true, trim: true })
  public firstName!: string;

  @Prop({ required: false, trim: true })
  public lastName?: string;

  @Prop({ required: true, lowercase: true, trim: true })
  public email!: string;

  @Prop({ required: true, trim: true })
  public mobileNumber!: string;

  @Prop({ required: true })
  public password!: string;

  @Prop({ type: String, default: null })
  profileImage?: string | null;

  @Prop({ required: true })
  public dob!: string;

  @Prop({ default: null })
  public subject?: string;

  @Prop({ enum: UserGender, default: null })
  public gender?: UserGender;

  @Prop({ default: [] })
  public serviceArea?: Array<string>;

  @Prop({ default: null })
  public description?: string;

  @Prop({ required: true, default: false })
  public isTncApproved!: boolean;

  @Prop({ required: true, default: false })
  public isNotificationSent!: boolean;

  @Prop({ enum: UserRole, default: UserRole.LEARNER })
  public role!: UserRole;

  @Prop({ type: String, default: '' })
  public bestDescribe?: string;

  @Prop({ enum: UserRegistrationType, default: UserRegistrationType.SELF })
  public registrationType!: UserRegistrationType;

  @Prop({ type: Object, default: {} })
  public purchaserDetail?: Record<string, unknown>;

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'UserAddress' }],
    default: [],
  })
  public addresses?: Types.ObjectId[];

  @Prop({ type: [String], default: [] })
  public languagesKnown?: string[];

  @Prop({ type: [String], default: [] })
  public proficientLanguages?: string[];

  @Prop({ default: 0 })
  public instructorExperienceYears?: number;

  @Prop({ default: 0 })
  public noOfLesson?: number;

  @Prop({ default: false })
  public isMemberOfDrivingAssociation?: boolean;

  @Prop({ type: [String], default: [] })
  public drivingAssociations?: string[];

  @Prop({
    type: [
      {
        registrationNumber: { type: String, required: false, default: '' },
        licenceCategory: { type: String, required: false, default: '' },
        make: { type: String, required: false, default: '' },
        model: { type: String, required: false, default: '' },
        color: { type: String, required: false, default: '' },
        year: { type: Number, required: false, default: 1990 },
        transmissionType: {
          type: String,
          enum: TransmissionType,
          required: true,
        },
        ancapSafetyRating: { type: String },
        hasDualControls: { type: Boolean, default: false },
      },
    ],
    default: [],
  })
  public vehicles?: VehicleInterface[];

  @Prop({
    type: {
      bankName: { type: String },
      accountHolderName: { type: String },
      accountNumber: { type: String },
      bsbNumber: { type: String },
      abnNumber: { type: String },
      businessName: { type: String },
    },
    default: null,
  })
  public financialDetail?: FinancialDetailInterface;

  @Prop({ default: true })
  public isActive!: boolean;

  @Prop({ default: false })
  public isDocumentVerified!: boolean;
}

export type UserDocument = User & Document & { _id: Types.ObjectId };
export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ email: 1, role: 1 }, { unique: true });
UserSchema.index({ mobile: 1, role: 1 }, { unique: true });
