import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class SlotCronService {
  

    // @Cron('*/5 * * * *')
    //@Cron('*/10 * * * * *') // every 10 seconds

    async releaseExpiredTempLocks() {
      console.log('🔄 Checking expired temp locks...');
    }
}