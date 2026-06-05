// instructor-lead.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type InstructorLeadDocument = InstructorLead & Document;

@Schema({ timestamps: true })
export class InstructorLead {
    @Prop({ required: true })
    firstName!: string;

    @Prop({ required: true })
    lastName!: string;

    @Prop({ required: true, lowercase: true })
    email!: string;

    @Prop({ required: true })
    phone!: string;

    @Prop({ required: true })
    state!: string;

    @Prop()
    postCode?: string;

    @Prop()
    message?: string;

    @Prop({ default: 'NEW' })
    status!: string;

    @Prop()
    utmSource?: string;

    @Prop()
    utmMedium?: string;

    @Prop()
    utmCampaign?: string;

    @Prop()
    utmContent?: string;

    @Prop()
    utmTerm?: string;
}

export const InstructorLeadSchema =
    SchemaFactory.createForClass(InstructorLead);