import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';


import { Types } from 'mongoose';
const defaultDocuments = {
  
    certificateOfCurrency: {
      documentNumber: "123456789",
      issueDate: null,
      expiryDate: null,
      expiryCycleMonths: 3,
      attachment: null,
      status: 'PENDING'},
  
    vehicleInspectionCertificate: {
      documentNumber: "987654321",
      issueDate: null,
      expiryDate: null,
      expiryCycleMonths: 6,
      attachment: null,
      status: 'PENDING'},
  
    industryAuthorityCard: {
      documentNumber: "1122334455",
      expiryDate: null,
      attachment: null,
      status: 'PENDING'},
  
    vehicleRegistration: {
      documentNumber: "5544332211",
      issueDate: null,
      expiryDate: null,
      expiryCycleMonths: 12,
      attachment: null,
      status: 'PENDING'}  
    
}
export class InstructorDocument {
  @Prop()
  documentNumber?: string;

  @Prop()
  issueDate?: Date;

  @Prop()
  expiryDate?: Date;

  @Prop()
  expiryCycleMonths?: number;

  @Prop()
  attachment?: string;

  @Prop({ default: 'PENDING' })
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export class InstructorDocuments {

  @Prop({ type: InstructorDocument })
  certificateOfCurrency?: InstructorDocument;

  @Prop({ type: InstructorDocument })
  vehicleInspectionCertificate?: InstructorDocument;

  @Prop({ type: InstructorDocument })
  industryAuthorityCard?: {
    documentNumber?: string;
    expiryDate?: Date;
    attachment?: string;
    status?: string;
  };

  @Prop({ type: InstructorDocument })
  vehicleRegistration?: InstructorDocument;
}

const defaultVehicles = {
  auto: {
    hasVehicle: false,
    pricePerHour: 40,
    testPricePerHour: 50,
    details: {
      registrationNumber: null,
      licenceCategory: null,
      make: null,
      model: null,
      color: null,
      year: null,
      transmissionType: "auto",
      ancapSafetyRating: null,
      hasDualControls: false  
    }
  },
  manual: {
    hasVehicle: false,
    pricePerHour: 40,
    testPricePerHour: 50,
    details: {
      registrationNumber: null,
      licenceCategory: null,
      make: null,
      model: null,
      color: null,
      year: null,
      transmissionType: "manual",
      ancapSafetyRating: null,
      hasDualControls: false  
    }
  },
  private: {
    hasVehicle: true,
    auto: {
      pricePerHour: 40,
      testPricePerHour: 50
    },
    manual: {
      pricePerHour: 40,
      testPricePerHour: 50
    }
  }
};

const defaultFinancialDetails = {
  bankName: null,
  accountHolderName: null,
  accountNumber: null,
  bsbNumber: null,
  abnNumber: null,
  businessName: null
};


//availbility
@Schema({ _id: false })
export class TimeSlot {
  @Prop({ required: true })
  startTime!: string;

  @Prop({ required: true })
  endTime!: string;

  @Prop({ default: false })
    isBooked?: boolean;
    
    @Prop({ type: Types.ObjectId, ref: 'Order', default: null })
    bookingId?: Types.ObjectId;
}

@Schema({ _id: false })
export class AvailabilityDay {
  @Prop({ required: true })
  date!: string;

  @Prop({ type: [TimeSlot], default: [] })
  slots!: TimeSlot[];
}

@Schema({ _id: false })
export class AvailabilityWeek {
  @Prop({ required: true })
  weekId!: string;

  @Prop({ required: true })
  startDate!: string;

  @Prop({ required: true })
  endDate!: string;

  @Prop({ type: [AvailabilityDay], default: [] })
  days!: AvailabilityDay[];
}

@Schema({ _id: false })
export class Availability {
  @Prop({ type: [AvailabilityWeek], default: [] })
  weeks!: AvailabilityWeek[];
}

//end
export class FinancialDetails {
  @Prop()
  bankName?: string;

  @Prop()
  accountHolderName?: string;

  @Prop()
  accountNumber?: string;

  @Prop()
  bsbNumber?: string;

  @Prop()
  abnNumber?: string;

  @Prop()
  businessName?: string;
}

// @Schema({ timestamps: true })
@Schema({ collection: 'instructorprofiles', timestamps: true })
export class InstructorProfile {

  @Prop({ type: Types.ObjectId, ref: 'User', unique: true })
  userId!: Types.ObjectId;

  @Prop({
    type: [
      {
        weekId: String,
        startDate: String,
        endDate: String,
        days: [
          {
            date: String,
            slots: [
              {
                startTime: String,
                endTime: String,
              },
            ],
          },
        ],
      },
    ],
    default: [],
  })
  availabilityWeeks!: AvailabilityWeek[];

  @Prop({ type: [String], index: true })
  suburbs!: string[];

  @Prop({
    type: [
      {
        suburb: { type: String, required: true },
        postcode: { type: String, default: null },
        radiusKm: { type: Number, default: 5 },
        suburbId: { type: String, default: null },
        lat: { type: Number, default: null },
        long: { type: Number, default: null },
      },
    ],
    default: [],
  })
  serviceAreas!: {
    suburb: string;
    postcode?: string;
    radiusKm?: number;
    suburbId?: string;
    lat?: number;
    long?: number;
  }[];
  
  @Prop({ type: Availability, default: { weeks: [] } })
  availability!: Availability;
 
  

  @Prop({
    type: Object,
    default: defaultVehicles
  })
  vehicles!: {
    auto?: VehicleWithDetails;
    manual?: VehicleWithDetails;
    private?: {
      hasVehicle: boolean;
      auto?: PriceBlock;
      manual?: PriceBlock;
    };
  };

  @Prop({
    type: FinancialDetails,
    default: defaultFinancialDetails
  })
  financialDetails?: FinancialDetails;

  @Prop({ default: 0 })
  rating!: number;

  @Prop({ default: false })
  isVerified!: boolean;

  @Prop({ type: InstructorDocuments,default: defaultDocuments })
  documents?: InstructorDocuments;
}

export class VehicleWithDetails {
  hasVehicle!: boolean;
  pricePerHour?: number;
  testPricePerHour?: number;
  details?: VehicleDetails;
}

export class PriceBlock {
  pricePerHour?: number;
  testPricePerHour?: number;
}

export class VehicleDetails {
  registrationNumber?: string;
  licenceCategory?: string;
  make?: string;
  model?: string;
  color?: string;
  year?: number;
  transmissionType?: 'Auto' | 'Manual';
  ancapSafetyRating?: number;
  hasDualControls?: boolean;
}



export type InstructorProfileDocument = InstructorProfile & Document & { _id: Types.ObjectId };
export const InstructorProfileSchema = SchemaFactory.createForClass(InstructorProfile);