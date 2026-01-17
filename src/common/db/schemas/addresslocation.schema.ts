import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false }) // embedded document
export class AddressLocation {

  @Prop({ required: true, trim: true })
  state!: string;

  @Prop({ required: true, trim: true })
  location!: string;

  @Prop({ required: true, trim: true })
  address!: string;

  @Prop({ required: true, trim: true })
  suburb!: string;

  @Prop({ required: true })
  postCode!: number;
}

export const AddressLocationSchema =
  SchemaFactory.createForClass(AddressLocation);

  