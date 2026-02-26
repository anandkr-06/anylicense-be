// src/common/interceptors/financial-mask.interceptor.ts
import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
  } from '@nestjs/common';
  import { map } from 'rxjs/operators';
  import { maskFinancialDetails } from '../maskers/financial-details.masker';
  
  @Injectable()
  export class FinancialMaskInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler) {
      return next.handle().pipe(
        map((response) => {
          const profile = response?.data?.profile;
  
          if (profile?.financialDetails) {
            profile.financialDetails = maskFinancialDetails(
              profile.financialDetails,
            );
          }
  
          return response;
        }),
      );
    }
  }