import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  TransmissionType,
  UserGender,
  UserRole,
} from 'constant';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Types } from 'mongoose';

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

  @Prop({ required: false })
  public dob!: string;

  
  @Prop({ enum: UserGender, default: UserGender.MALE })
  public gender?: UserGender;

  @Prop({ required: false, trim: true })
  
  public postCode!: string;

  @Prop({ required: true, trim: true })
  
  public state!: string;

  @Prop({ default: [] })
  public serviceArea?: Array<string>;

  @Prop({ required: true, trim: true })
  public description!: string;

  @Prop({ required: true, default: false })
  public isTncApproved!: boolean;

  @Prop({ required: true, default: false })
  public isNotificationSent!: boolean;

  @Prop({ enum: UserRole, default: UserRole.INSTRUCTOR })
  public role!: UserRole;

  //Multi Language Support
  @Prop({ type: [String], default: [] })
  public languagesKnown?: string[];

  @Prop({ type: [String], default: [] })
  public proficientLanguages?: string[];
//Multi Language Support
  @Prop({ default: 0 })
  public instructorExperienceYears?: number;

  @Prop({ default: 0 })
  public noOfLesson?: number;

  @Prop({ default: false })
  public isMemberOfDrivingAssociation?: boolean;

  @Prop({ enum: TransmissionType, default: TransmissionType.MANUAL })
  transmissionType!:  TransmissionType; 
  @Prop({ default: true })
  public isActive!: boolean;
}

export type UserDocument = User & Document & { _id: Types.ObjectId };
export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ mobileNumber: 1 }, { unique: true });

