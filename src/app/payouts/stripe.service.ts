import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor() {
    const key = process.env['STRIPE_SECRET_KEY'];
    if (!key) throw new Error('STRIPE_SECRET_KEY missing');

    this.stripe = new Stripe(key, {
        apiVersion: '2025-12-15.clover',
    });
  }

  // 1️⃣ Create Stripe Express Account
  async createExpressAccount(email: string) {
    const account = await this.stripe.accounts.create({
      type: 'express',
      email: email,
      capabilities: {
        transfers: { requested: true },
      },
    });

    return account;
  }

  // 2️⃣ Generate onboarding link
  async createAccountOnboardingLink(accountId: string) {
    const accountLink = await this.stripe.accountLinks.create({
      account: accountId,
      refresh_url: 'https://dev.anylicence.com/reauth',
      return_url: 'https://dev.anylicence.com/dashboard',
      type: 'account_onboarding',
    });

    return accountLink;
  }




 async getAccountExternals(accountId: string) {
    const external = await this.stripe.accounts.listExternalAccounts(
  accountId,
  { object: 'bank_account' }
);

console.log("external.data",external.data);
    return external.data;
  }

  
  // 4️⃣ Check Stripe balance
  async getBalance(accountId: string) {
    return this.stripe.balance.retrieve({
      stripeAccount: accountId,
    });
  }


  // Transfer from platform → instructor Stripe account
  async createTransfer(accountId: string, amount: number, instructorId: string) {


    const idempotencyKey = `fastcash_${instructorId}_${Date.now()}`;

    

    return this.stripe.transfers.create(
      {
        amount,
        currency: 'aud',
        destination: accountId,
      },
      {
        idempotencyKey,
      },
    );
  }

  // Instant payout from instructor Stripe account → bank/debit card
  async instantPayout(accountId: string, amount: number) {
    return this.stripe.payouts.create(
      {
        amount,
        currency: 'aud',
        method: 'instant',
      },
      {
        stripeAccount: accountId,
      },
    );
  }

  // Check Stripe account
  async getAccount(accountId: string) {
    return this.stripe.accounts.retrieve(accountId);
  }


async getPlatformBalance() {
    return this.stripe.balance.retrieve();
  }


  // 🧪 TEST ONLY - Add funds to Stripe platform balance
async createTestCharge() {

  const charge = await this.stripe.charges.create({
    amount: 10000, // $100
    currency: 'aud',
    source: 'tok_visa', // Stripe test token
    description: 'Test charge to add funds to platform balance',
  });

  return charge;
}

async addTestBalance() {
  return this.stripe.topups.create({
    amount: 10000,
    currency: 'aud',
    description: 'Test platform balance topup',
  });
}

}