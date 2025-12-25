import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { MongoServerError } from 'mongodb';
import {
  BAD_REQUEST,
  GENERIC_CODE,
  INTERNAL_SERVER_ERROR,
  RESOURCE_NOT_FOUND,
} from '../constant/errors';

interface ApiResponse {
  message?: string;
  errors?: ApiErrors;
  apiErrors?: ApiErrorResponse;
  data?: ApiErrors;
  error?: string;
  code?: string;
  title?: string;
}

interface ApiErrors {
  errors?: ApiError[];
  code?: string;
  title?: string;
}

interface ApiError {
  type: string;
  code: string;
  source: string;
  message: string;
  title?: string;
}

interface ApiErrorResponse {
  type: string;
  code: string;
  source: string;
  message: string;
}

interface ErrorDetails {
  status: number;
  errorMessage: string;
  code: string;
}

@Injectable()
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  public catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, errorMessage, code } = this.getErrorDetails(exception);

    const message = this.createErrorResponse(
      request,
      status,
      errorMessage,
      code,
    );

    response.status(status).json(message);
  }

  private getErrorDetails(exception: unknown): ErrorDetails {
    if (exception instanceof NotFoundException) {
      return this.handleNotFoundException();
    } else if (exception instanceof BadRequestException) {
      return this.handleBadRequestException(exception);
    } else if (exception instanceof InternalServerErrorException) {
      return this.handleInternalServerErrorException(exception);
    } else if (exception instanceof UnauthorizedException) {
      return this.handleUnauthorizedException(exception);
    } else if (exception instanceof HttpException) {
      return this.handleHttpException(exception);
    } else if (exception instanceof MongoServerError) {
      return this.handleMongoServerError(exception);
    } else {
      return this.handleUnknownException();
    }
  }

  private handleMongoServerError(exception: MongoServerError): ErrorDetails {
    if (exception.code === 11000) {
      const field = Object.keys(exception['keyPattern'] || {})[0];
      let message = 'Duplicate key error';

      if (field) {
        const value = exception['keyValue']?.[field];
        message = `${field} '${value}' already exists`;
      }

      return {
        status: HttpStatus.CONFLICT,
        errorMessage: message,
        code: 'DUPLICATE_KEY',
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      errorMessage: exception.message,
      code: 'MONGO_ERROR',
    };
  }

  private handleNotFoundException(): ErrorDetails {
    return {
      status: HttpStatus.NOT_FOUND,
      errorMessage: RESOURCE_NOT_FOUND,
      code: GENERIC_CODE,
    };
  }

  private handleBadRequestException(
    exception: BadRequestException,
  ): ErrorDetails {
    const apiResponse: ApiResponse = exception.getResponse() as ApiResponse;
    const errorMessage = apiResponse.message ?? BAD_REQUEST;

    return {
      status: HttpStatus.BAD_REQUEST,
      errorMessage,
      code: GENERIC_CODE,
    };
  }

  private handleInternalServerErrorException(
    exception: InternalServerErrorException,
  ): ErrorDetails {
    const response: any = exception.getResponse?.();
    const message =
      typeof response === 'string'
        ? response
        : response?.message || INTERNAL_SERVER_ERROR;

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      errorMessage: message,
      code: GENERIC_CODE,
    };
  }

  private handleUnauthorizedException(
    exception: UnauthorizedException,
  ): ErrorDetails {
    return {
      status: HttpStatus.UNAUTHORIZED,
      errorMessage: exception.message,
      code: GENERIC_CODE,
    };
  }

  private handleHttpException(exception: HttpException): ErrorDetails {
    const { data, error }: ApiResponse = exception.getResponse() as ApiResponse;

    return {
      status: exception.getStatus(),
      errorMessage:
        data?.errors?.[0]?.title ?? data?.title ?? error ?? exception.message,
      code: data?.errors?.[0]?.code ?? data?.code ?? GENERIC_CODE,
    };
  }

  private handleUnknownException(): ErrorDetails {
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      errorMessage: INTERNAL_SERVER_ERROR,
      code: GENERIC_CODE,
    };
  }

  private createErrorResponse(
    request: Request,
    status: number,
    errorMessage: string,
    code: string,
  ): ApiErrorResponse {
    return {
      type: HttpStatus[status] ?? INTERNAL_SERVER_ERROR,
      code: `${status}/${code}`,
      source: request.url,
      message: errorMessage,
    };
  }
}

// export class GlobalExceptionFilter implements ExceptionFilter {
//   catch(exception: unknown, host: ArgumentsHost): void {
//     const ctx = host.switchToHttp();
//     const response = ctx.getResponse<Response>();
//     const request = ctx.getRequest<Request>();

//     let status = HttpStatus.INTERNAL_SERVER_ERROR;
//     let message = 'Internal Server Error';
//     let code = GENERIC_ERROR;

//     if (exception instanceof HttpException) {
//       status = exception.getStatus();
//       const res: any = exception.getResponse();
//       message = typeof res === 'string' ? res : res.message || message;
//       code = res.code || code;
//     }

//     response.status(status).json(errorResponse(message, status, code));
//   }
// }
