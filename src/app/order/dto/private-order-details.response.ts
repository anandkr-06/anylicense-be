export type OrderStatusType =
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'REFUNDED';

export type PaymentStatusType =
  | 'PENDING'
  | 'PAID'
  | 'FAILED';

export class PrivateOrderDetailsResponseDto {
  id!: string;
  status!: OrderStatusType;
  paymentStatus!: PaymentStatusType;
  vehicleType!: 'AUTO' | 'MANUAL';
  totalAmount!: number;
  createdAt!: Date;

  privateLearner!: {
    firstName: string;
    mobileNumber: string;
    preferredVehicleType: 'AUTO' | 'MANUAL';
  };

  lessonSlots!: any[];
  testPackage!: any | null;
}
