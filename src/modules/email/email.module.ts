import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';
import { EmailService } from './email.service';

@Module({
  imports: [
    MailerModule.forRoot({
      transport: {
        host: process.env["SMTP_HOST"],
        port: process.env["SMTP_PORT"],
        secure: false,
        auth: {
          user: process.env["SMTP_USER"],
          pass: process.env["SMTP_PASS"],
        },
      },
      defaults: {
        from: `"Anylicence" <${process.env["SMTP_USER"]}>`,
      },
      template: {
        // 👇 IMPORTANT
        dir: join(process.cwd(), 'src/modules/email/email.templates'),
        adapter: new HandlebarsAdapter(),
        options: {
          strict: false, // prevents blank emails
        },
      },
    }),
  ],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
