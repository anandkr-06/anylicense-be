import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 🔥 MUST be first — before prefix, pipes, guards
  app.use(
    '/api/webhooks/stripe',
    bodyParser.raw({ type: 'application/json' }),
  );

  // Global prefix
  app.setGlobalPrefix('api');

  // Normal app stuff
  app.enableCors({ origin: '*' });

  await app.listen(3001);
  console.log('🚀 Server running on http://localhost:3001');
}

bootstrap();
