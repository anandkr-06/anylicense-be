import type { Type } from '@nestjs/common';
import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiQuery,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';

import { ERROR_CONFIGS } from './swagger-constants';

export function commonSwaggerErrorResponses(
  descriptions: Array<string[] | string>,
): MethodDecorator {
  return applyDecorators(
    ...ERROR_CONFIGS.map((cfg, idx) => {
      return ApiResponse({
        status: cfg.status,
        description: Array.isArray(descriptions[idx])
          ? (descriptions[idx] as string[]).join('</br>')
          : (descriptions[idx] as string),
        schema: {
          example: {
            type: cfg.type,
            code: cfg.code,
            source: '/path',
            message: cfg.message,
          },
        },
      });
    }),
  );
}

export function commonSwaggerQuery(
  fieldName: string,
  description: string,
  status: boolean,
): MethodDecorator {
  return applyDecorators(
    ApiQuery({
      name: fieldName,
      required: status,
      type: String,
      description,
    }),
  );
}

export function commonSwaggerSuccess(
  description: string,
  message: boolean | number | object | string | null,
  type?: Type,
): MethodDecorator {
  return applyDecorators(
    ApiResponse({
      status: HttpStatus.OK,
      description,
      type,
      schema: {
        example: message,
      },
    }),
  );
}

export function commonSwaggerFile(description: string): MethodDecorator {
  return applyDecorators(
    ApiConsumes('multipart/form-data'),
    ApiBody({
      required: true,
      schema: {
        type: 'object',
        properties: {
          file: {
            type: 'string',
            format: 'binary',
            description,
          },
        },
      },
    }),
  );
}

export function commonSwaggerSuccessNew<TModel extends Type>(
  description: string,
  model: TModel,
): MethodDecorator {
  return applyDecorators(
    ApiResponse({
      status: HttpStatus.OK,
      description,
      schema: {
        $ref: getSchemaPath(model), // reference to your DTO/interface (class)
      },
    }),
  );
}
