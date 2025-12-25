import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema({ timestamps: true, collection: 'user_address' })
export class UserAddress {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  public userId!: Types.ObjectId;

  @Prop({ default: () => uuidv4(), unique: true })
  public publicId!: string;

  @Prop({ type: Types.ObjectId, ref: 'Suburb', required: true })
  public suburbId!: string;

  @Prop({ required: true })
  public pickUpAddress?: string;

  @Prop({ required: false, default: null })
  public label?: string;

  @Prop({ required: false, default: null })
  public street?: string;

  @Prop({ required: false, default: null })
  public city?: string;

  @Prop({ required: false, default: null })
  public state?: string;

  @Prop({ required: false, default: null })
  public country?: string;

  @Prop({ required: false, default: null })
  public postalCode?: string;

  @Prop({
    type: { type: String, enum: ['Point'], default: 'Point' },
  })
  public geometryType?: string;

  @Prop({
    type: [Number], // [longitude, latitude]
    index: '2dsphere',
    required: false,
  })
  public coordinates?: number[];

  @Prop({ required: false, default: false })
  public isPrimary?: boolean;
}

export type AddressDocument = UserAddress & Document & { _id: Types.ObjectId };
export const AddressSchema = SchemaFactory.createForClass(UserAddress);
