export type OrderStatusType =
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'REFUNDED';

export class CancelPrivateOrderResponseDto {
  message!: string;
  orderId!: string;
  status!: OrderStatusType;
}
