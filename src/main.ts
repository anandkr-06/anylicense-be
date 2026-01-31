import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
const cookieParser = require("cookie-parser"); // ✅ CORRECT
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false, // 🔥 REQUIRED
  });

  // 🔥 Stripe webhook MUST be raw
  app.use(
    '/api/webhooks/stripe',
    bodyParser.raw({ type: 'application/json' }),
  );
  app.use(cookieParser());   // 👈 REQUIRED
  // ✅ JSON for rest of app
  app.use(bodyParser.json());

  app.setGlobalPrefix('api');
  app.enableCors({ origin: '*' });

  await app.listen(3001);
  console.log('🚀 Server running on http://localhost:3001');
}

bootstrap();
