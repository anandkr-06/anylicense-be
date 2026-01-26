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

  @Prop({
    type: {
      type: String,
      enum: ['Polygon', 'MultiPolygon'],
      required: false
    },
    coordinates: {
      type: [],
      required: false
    }
  })
  geometry?: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: any;
  };
  
}

export type SuburbDocument = Suburb & Document & { _id: Types.ObjectId };
export const SuburbSchema = SchemaFactory.createForClass(Suburb);
SuburbSchema.index({ geometry: '2dsphere' });


// schema.index({ geometry: '2dsphere' });
// schema.index({ locality: 1, state: 1 });

