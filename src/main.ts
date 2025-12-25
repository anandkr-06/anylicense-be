import { NestFactory } from '@nestjs/core';

import { ConfigService } from '@nestjs/config';
import { AppModule } from 'app.module';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getSwaggerConfig, GlobalExceptionFilter } from 'lib';
import { Logger } from 'nestjs-pino';
import { SwaggerModule } from '@nestjs/swagger';

function setupMiddleware(app: INestApplication): void {
  app.useLogger(app.get(Logger));

  app.useLogger(app.get(Logger));
  app.setGlobalPrefix('api');
  // app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors({
    origin: '*', //allowedFrontend
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
  });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  setupMiddleware(app);
  const configService = app.get(ConfigService);

  const port = configService.get<number>('APP_PORT', 3001);
  const appName = configService.get<string>('APP_NAME', 'Any License');

  const document = SwaggerModule.createDocument(
    app,
    getSwaggerConfig(appName, '1.0'),
  );

  SwaggerModule.setup('swagger', app, document);

  const logger = app.get(Logger);
  await app.listen(port);
  logger.log(`🚀 Application is running on: http://localhost:${port ?? 3001}`);
}
bootstrap();
