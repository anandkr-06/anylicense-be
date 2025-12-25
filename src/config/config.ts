import { registerAs } from '@nestjs/config';
import {
  ensureEnvironment,
  ensureEnvProperty,
  ensureEnvPropertyNumeric,
} from './env.helper';

export const enum ConfigKey {
  App = 'APP',
  JwtConfig = 'JWT_CONFIG',
}

export type AppConfig = {
  env: string;
  port: number;
  appName: string;
};

export interface JwtConfig {
  jwtSecret: string;
  [key: string]: unknown;
}

const APP_CONFIG = registerAs(ConfigKey.App, (): AppConfig => {
  return {
    env: ensureEnvironment(),
    port: ensureEnvPropertyNumeric('APP_PORT'),
    appName: ensureEnvProperty('APP_NAME'),
  };
});

const JWT_CONFIG = registerAs(ConfigKey.JwtConfig, (): JwtConfig => {
  return {
    jwtSecret: ensureEnvProperty('JWT_SECRET'),
  };
});

export const configurations = [APP_CONFIG, JWT_CONFIG];
