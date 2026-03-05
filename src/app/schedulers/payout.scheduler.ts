import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PayoutService } from '../payouts/payout.service'

@Injectable()
export class PayoutScheduler {
  constructor(private readonly payoutService: PayoutService) {}

  @Cron('0 0 * * 0') // Every Sunday
  async handleWeeklyPayout() {
    console.log('Running weekly payout job');

    await this.payoutService.generateWeeklyPayout();
  }
}