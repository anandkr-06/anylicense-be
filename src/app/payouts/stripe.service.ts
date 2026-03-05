import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor() {
    const stripeKey = process.env['STRIPE_SECRET_KEY'];

    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY is not defined');
    }

    this.stripe = new Stripe(stripeKey, {
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
      refresh_url: 'https://yourapp.com/reauth',
      return_url: 'https://yourapp.com/dashboard',
      type: 'account_onboarding',
    });

    return accountLink;
  }

  // 3️⃣ Instant payout (Fast Cash)
  async instantPayout(accountId: string, amount: number) {
    const payout = await this.stripe.payouts.create(
      {
        amount: amount,
        currency: 'usd',
        method: 'instant',
      },
      {
        stripeAccount: accountId,
      },
    );

    return payout;
  }

  // 4️⃣ Check Stripe balance
  async getBalance(accountId: string) {
    return this.stripe.balance.retrieve({
      stripeAccount: accountId,
    });
  }
}