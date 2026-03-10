import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
const cookieParser = require("cookie-parser");

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  // Stripe webhook MUST stay raw
  app.use('/webhooks/stripe', bodyParser.raw({ type: '*/*' }));

  app.use(cookieParser());

  // normal JSON parser
  app.use(bodyParser.json());

  app.setGlobalPrefix('api');

  app.enableCors({ origin: '*' });

  await app.listen(3001);

  console.log('🚀 Server running on http://localhost:3001');
}

bootstrap();