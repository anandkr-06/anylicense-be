import type { OpenAPIObject } from '@nestjs/swagger';
import { DocumentBuilder } from '@nestjs/swagger';

export function getSwaggerConfig(
  appName: string,
  version: number | string,
): Omit<OpenAPIObject, 'paths'> {
  return new DocumentBuilder()
    .setTitle(appName)
    .setDescription(`${appName} API description`)
    .setVersion(version.toString())
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'jwt-auth',
    )

    .build();
}
