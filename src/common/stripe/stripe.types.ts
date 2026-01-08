export type StripeIntentMetadata = {
    purpose: 'WALLET_TOPUP' | 'ORDER_PAYMENT';
    orderId?: string;
    learnerId?: string;
  };
  
  export type StripeCardMeta = {
    brand?: string;
    last4?: string;
    expMonth?: number;
    expYear?: number;
    paymentIntentId: string;
    chargeId?: string;
  };
  