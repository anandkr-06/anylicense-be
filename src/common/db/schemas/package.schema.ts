import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { IsString, IsNumber } from 'class-validator';
import { TransmissionType } from '@constant/packages';

@Schema({ timestamps: true, collection: 'packages' })
export class Package {
  @Prop({ type: String, default: () => uuidv4(), unique: true })
  public publicId!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  public userId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  public name!: string;

  @Prop({ trim: true })
  public type?: string;

  @Prop({ trim: true })
  @IsString()
  public description?: string;

  @Prop({ enum: TransmissionType, default: TransmissionType.AUTO })
  public transmissionType!: TransmissionType;

  @Prop({ type: Number })
  @IsNumber()
  public durationInHours?: number;

  @Prop({
    trim: true,
    description: '/ e.g. "2 hours", "1.5 hrs"',
  })
  @IsString()
  public durationInString?: string; // e.g. "2 hours", "1.5 hrs"

  @Prop({ type: Number })
  @IsNumber()
  public amountPerHour?: number;

  @Prop({ type: Number, required: true })
  @IsNumber()
  public amount!: number;

  @Prop({ type: Number, required: true })
  @IsNumber()
  public minAmount!: number;

  @Prop({ type: Number, required: true })
  @IsNumber()
  public maxAmount!: number;

  @Prop({ default: true })
  public isActive!: boolean;
  @Prop({ default: false })
  public isEditable!: boolean;
}

export type PackageDocument = Package & Document & { _id: Types.ObjectId };
export const PackageSchema = SchemaFactory.createForClass(Package);
