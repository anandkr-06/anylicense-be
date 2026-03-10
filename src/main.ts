import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';

async function bootstrap() {

  const app = await NestFactory.create(AppModule, {
    rawBody: true, // ✅ enables req.rawBody
  });

  // Normal parsers for other routes
  // app.use(bodyParser.json());
  // app.use(bodyParser.urlencoded({ extended: true }));

  app.setGlobalPrefix('api');
  app.enableCors({ origin: '*' });

  await app.listen(3001);

  console.log('🚀 Server running on http://localhost:3001');
}

bootstrap();


