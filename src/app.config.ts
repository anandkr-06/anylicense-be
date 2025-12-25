/**
 * Purpose: only loads and validates environment variables.
 * Loads .env variables
 * Validates them (using Joi)
 * Makes them available globally through ConfigService
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configurations } from 'config/config';
import * as Joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: configurations,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        APP_NAME: Joi.string().default('any-license'),
        APP_PORT: Joi.number().default(3000),
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
      }),
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
  ],
  exports: [ConfigModule],
})
export class AppConfigModule {}
