import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/* ===============================
   📌 ENUMS
=============================== */
export enum NoShowStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
}

export enum RequestedBy {
    LEARNER = 'LEARNER',
    INSTRUCTOR = 'INSTRUCTOR',
}
export enum NoShowDecision {
    PAY_INSTRUCTOR = 'PAY_INSTRUCTOR',
    REFUND_LEARNER = 'REFUND_LEARNER',
}

/* ===============================
   📄 DOCUMENT TYPE
=============================== */
export type NoShowRequestDocument = NoShowRequest & Document;

/* ===============================
   🧾 SCHEMA
=============================== */
@Schema({ timestamps: true })
export class NoShowRequest {
    @Prop({ type: Types.ObjectId, ref: 'Order', required: true, index: true })
    bookingId!: Types.ObjectId;

    @Prop({ type: String, enum: RequestedBy, required: true })
    requestedBy!: RequestedBy;

    @Prop({ type: String, required: true })
    reason!: string;

    @Prop({
        type: String,
        enum: NoShowStatus,
        default: NoShowStatus.PENDING,
        index: true,
    })
    status!: NoShowStatus;

    @Prop({ type: Types.ObjectId, ref: 'Admin', default: null })
    adminId?: Types.ObjectId;

    @Prop({ type: String, default: null })
    adminRemark?: string;

    @Prop({ type: Types.ObjectId, required: true, index: true })
    slotId!: Types.ObjectId;



    @Prop({ type: String, enum: NoShowDecision, default: null })
    decision?: NoShowDecision;

}

/* ===============================
   🏗️ SCHEMA FACTORY
=============================== */
export const NoShowRequestSchema =
    SchemaFactory.createForClass(NoShowRequest);

/* ===============================
   ⚡ INDEXES (IMPORTANT)
=============================== */

// Prevent duplicate request for same booking (optional but recommended)
NoShowRequestSchema.index(
    { bookingId: 1, status: 1 },
    { partialFilterExpression: { status: 'PENDING' } },
);

// Faster admin queries
NoShowRequestSchema.index({ status: 1, createdAt: -1 });