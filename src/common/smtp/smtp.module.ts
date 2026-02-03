import { Module } from '@nestjs/common';
import { SmtpErrorHandlerService } from './smtp-error-handler.service';

@Module({
  providers: [SmtpErrorHandlerService],
  exports: [SmtpErrorHandlerService], // 👈 IMPORTANT
})
export class SmtpModule {}
