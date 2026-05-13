// src/contact/contact.module.ts

import { Module } from '@nestjs/common';
import { ContactController } from './controllers/contact.controller';
import { ContactService } from './services/contact.service';
import { NotificationModule } from 'modules/notifications/notification.module';

@Module({
    imports: [
    // ✅ Import here
    NotificationModule,
  ],
  controllers: [ContactController],
  providers: [ContactService],
})
export class ContactModule {}