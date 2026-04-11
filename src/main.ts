import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
//import { ValidationPipe } from '@nestjs/common';
// import * as crypto from 'crypto';

// if (!(global as any).crypto) {
//   (global as any).crypto = crypto;
// }


async function bootstrap() {

  const app = await NestFactory.create(AppModule, {
    rawBody: true, // ✅ enables req.rawBody
  });

  // Normal parsers for other routes
  // app.use(bodyParser.json());
  // app.use(bodyParser.urlencoded({ extended: true }));

  // app.useGlobalPipes(
  //   new ValidationPipe({
  //     whitelist: true,
  //     forbidNonWhitelisted: true,
  //     transform: true,
  //   }),
  // );

  app.setGlobalPrefix('api');
  app.enableCors({ origin: '*' });

  await app.listen(3001);

  console.log('🚀 Server running on http://localhost:3001');
}

bootstrap();


