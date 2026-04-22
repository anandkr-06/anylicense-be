export type StripeIntentMetadata = {
  purpose: 'WALLET_TOPUP' | 'ORDER_PAYMENT' | 'GIFT_VOUCHER';

  orderId?: string;

  // ✅ PUBLIC order only
  learnerId?: string;

  // 🔥 NEW (OPTIONAL → no breaking change)
  orderType?: 'PUBLIC' | 'PRIVATE';
  
  giftVoucherId?: string;
  
  originalAmount?: string;
  platformFee?: string;
  
};

  
  export type StripeCardMeta = {
    brand?: string;
    last4?: string;
    expMonth?: number;
    expYear?: number;
    paymentIntentId: string;
    chargeId?: string;
  };

  export type ExtraWalletMetaFIFO = {
    totalHours?: number;
    remainingHours?: number;
    consumedHours?: number;
    discountRate?: number;
  };
  
