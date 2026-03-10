import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
const cookieParser = require('cookie-parser');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(
    '/webhooks/stripe',
    bodyParser.raw({ type: 'application/json' }),
  );

  app.setGlobalPrefix('api');
  app.enableCors({ origin: '*' });

  await app.listen(3001);
}
bootstrap();

