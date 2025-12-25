import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema({ timestamps: true })
export class Suburb extends Document {
  @Prop({ default: () => uuidv4(), unique: true })
  public publicId!: string;

  @Prop({ required: true })
  public name!: string;

  @Prop({ required: true })
  public state!: string;

  @Prop({ required: true })
  public postcode!: string;

  @Prop({ required: true })
  public text!: string;

  @Prop({ default: true })
  public isActive!: boolean;
}

export type SuburbDocument = Suburb & Document & { _id: Types.ObjectId };
export const SuburbSchema = SchemaFactory.createForClass(Suburb);
