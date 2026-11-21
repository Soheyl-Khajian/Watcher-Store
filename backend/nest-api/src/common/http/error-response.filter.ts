// backend/nest-api/src/common/http/error-response.filter.ts
//
// Turns every error into one response shape:
//   { statusCode, error, message, details? }
// - message: one Persian sentence for people. Messages the code already
//   writes in Persian are kept; framework defaults in English ("Unauthorized",
//   "Cannot GET /x", "Too Many Requests", body-parser errors) are replaced by
//   a Persian sentence for their status.
// - details: field problems from validation, for developers.
// Unexpected errors become a generic 500; the real error is only logged.

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { STATUS_CODES } from 'http';

const PERSIAN = /[؀-ۿ]/;

const VALIDATION_MESSAGE = 'اطلاعات ارسالی معتبر نیست.';

const DEFAULT_MESSAGES: Record<number, string> = {
  400: 'درخواست معتبر نیست.',
  401: 'برای ادامه وارد حساب کاربری خود شوید.',
  403: 'اجازه انجام این کار را ندارید.',
  404: 'مورد درخواستی یافت نشد.',
  409: 'این درخواست با وضعیت فعلی سازگار نیست.',
  413: 'حجم درخواست بیش از حد مجاز است.',
  429: 'تعداد درخواست‌ها بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید.',
  500: 'خطای غیرمنتظره‌ای رخ داد. لطفاً دوباره تلاش کنید.',
  502: 'پاسخ نامعتبری از سرویس فروشگاه دریافت شد.',
  503: 'سرویس فروشگاه موقتاً در دسترس نیست. لطفاً کمی بعد دوباره تلاش کنید.',
};

export interface ErrorBody {
  statusCode: number;
  error: string;
  message: string;
  details?: string[];
}

function defaultMessage(status: number): string {
  return (
    DEFAULT_MESSAGES[status] ??
    (status >= 500 ? DEFAULT_MESSAGES[500] : DEFAULT_MESSAGES[400])
  );
}

// Errors raised before Nest's routing, such as body-parser's invalid JSON or
// oversized body, carry an HTTP status of their own.
function clientErrorStatus(exception: unknown): number | null {
  if (typeof exception !== 'object' || exception === null) {
    return null;
  }
  const status = (exception as { status?: unknown; statusCode?: unknown })
    .status;
  return typeof status === 'number' && status >= 400 && status < 500
    ? status
    : null;
}

export function toErrorBody(exception: unknown): ErrorBody {
  let statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR;
  let message = defaultMessage(statusCode);
  let details: string[] | undefined;

  if (exception instanceof HttpException) {
    statusCode = exception.getStatus();
    const response = exception.getResponse();
    const raw =
      typeof response === 'string'
        ? response
        : (response as { message?: unknown }).message;

    if (Array.isArray(raw)) {
      message = VALIDATION_MESSAGE;
      details = raw.map(String);
    } else if (typeof raw === 'string' && PERSIAN.test(raw)) {
      message = raw;
    } else {
      message = defaultMessage(statusCode);
    }
  } else {
    const status = clientErrorStatus(exception);
    if (status !== null) {
      statusCode = status;
      message = defaultMessage(status);
    }
  }

  return {
    statusCode,
    error: STATUS_CODES[statusCode] ?? 'Error',
    message,
    ...(details ? { details } : {}),
  };
}

@Catch()
export class ErrorResponseFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErrorResponseFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const body = toErrorBody(exception);

    if (body.statusCode >= 500 && !(exception instanceof HttpException)) {
      this.logger.error(
        `${request.method} ${request.path} failed`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(body.statusCode).json(body);
  }
}
