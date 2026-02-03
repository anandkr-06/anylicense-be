export type StripeIntentMetadata = {
  purpose: 'WALLET_TOPUP' | 'ORDER_PAYMENT';

  orderId?: string;

  // ✅ PUBLIC order only
  learnerId?: string;

  // 🔥 NEW (OPTIONAL → no breaking change)
  orderType?: 'PUBLIC' | 'PRIVATE';
};

  
  export type StripeCardMeta = {
    brand?: string;
    last4?: string;
    expMonth?: number;
    expYear?: number;
    paymentIntentId: string;
    chargeId?: string;
  };
  
