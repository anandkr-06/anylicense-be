import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SmtpErrorHandlerService {
  private readonly logger = new Logger(SmtpErrorHandlerService.name);

  handle(error: any, context?: Record<string, any>) {
    const smtpCode = error?.code || error?.responseCode;

    const baseLog = {
      smtpCode,
      message: error?.message,
      ...context,
    };

    switch (smtpCode) {
      case 'EAUTH':
        this.logger.error('SMTP authentication failed', baseLog);
        break;

      case 'ECONNECTION':
      case 'ETIMEDOUT':
        this.logger.error('SMTP connection issue', baseLog);
        break;

      case 550:
        this.logger.error('Invalid recipient email', baseLog);
        break;

      default:
        this.logger.error('Unknown SMTP error', baseLog);
    }
  }
}
