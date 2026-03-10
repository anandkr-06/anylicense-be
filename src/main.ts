import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
const cookieParser = require('cookie-parser');

async function bootstrap() {

  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  // ⭐ Capture RAW body for Stripe
  app.use(
    bodyParser.json({
      verify: (req: any, res, buf) => {
        if (req.originalUrl.includes('/webhooks/stripe')) {
          req.rawBody = buf;
        }
      },
    }),
  );

  app.setGlobalPrefix('api');
  app.enableCors({ origin: '*' });

  await app.listen(3001);

  console.log('🚀 Server running on http://localhost:3001');
}

bootstrap();