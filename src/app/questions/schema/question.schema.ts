import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type QuestionDocument = HydratedDocument<Question>;

@Schema({ collection: 'questions', versionKey: false })
export class Question {
  @Prop({ required: true, index: true })
  code!: string;

  @Prop({ required: true, index: true })
  category!: string;

  @Prop({ type: [String], default: [] })
  licenceClasses!: string[];

  @Prop({ required: true })
  question!: string;

  @Prop({ type: [String], required: true })
  options!: string[];

  @Prop({ required: true })
  correctOptionIndex!: number;

  @Prop({ required: true })
  correctAnswer!: string;

  @Prop()
  sourcePage?: number;
}

export const QuestionSchema = SchemaFactory.createForClass(Question);
