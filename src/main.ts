// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './app.module';
// import * as bodyParser from 'body-parser';
// const cookieParser = require('cookie-parser');

// async function bootstrap() {

//   const app = await NestFactory.create(AppModule, {
//     rawBody: true,
//   });

//   app.use(cookieParser());

//   // // Stripe webhook raw body
//   // app.use(
//   //   '/api/webhooks/stripe',
//   //   bodyParser.raw({ type: 'application/json' }),
//   // );

//   app.setGlobalPrefix('api');
//   app.enableCors({ origin: '*' });

//   await app.listen(3001);

//   console.log('🚀 Server running on http://localhost:3001');
// }

// bootstrap();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
const cookieParser = require('cookie-parser');

async function bootstrap() {

  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  app.use(cookieParser());

  app.setGlobalPrefix('api');
  app.enableCors({ origin: '*' });

  await app.listen(3001);

  console.log('🚀 Server running on http://localhost:3001');
}

bootstrap();