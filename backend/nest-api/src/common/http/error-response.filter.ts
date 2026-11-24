// backend/nest-api/src/common/http/error-response.filter.ts
//
// Turns every error into one response shape:
//   { statusCode, error, code, params?, message, details?, requestId? }
// - code: what went wrong, as a stable code (api-error.ts) the storefront
//   words in its page's language; params: values for that wording.
//   Errors without a code of their own (framework defaults such as
//   "Unauthorized", "Cannot GET /x", "Too Many Requests", body-parser
//   errors) get the general code for their status.
// - message: English, for developers and logs; never shown to customers.
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
import type { ErrorCode, ErrorParams } from './api-error';

const DEFAULT_CODES: Record<number, ErrorCode> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  429: 'RATE_LIMITED',
  500: 'INTERNAL',
  502: 'BAD_GATEWAY',
  503: 'UNAVAILABLE',
};

export interface ErrorBody {
  statusCode: number;
  error: string;
  code: ErrorCode;
  params?: ErrorParams;
  message: string;
  details?: string[];
  // Matches the X-Request-Id header and the server's log line.
  requestId?: string;
}

function defaultCode(status: number): ErrorCode {
  return DEFAULT_CODES[status] ?? (status >= 500 ? 'INTERNAL' : 'BAD_REQUEST');
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
  let code = defaultCode(statusCode);
  let params: ErrorParams | undefined;
  let message: string | undefined;
  let details: string[] | undefined;

  if (exception instanceof HttpException) {
    statusCode = exception.getStatus();
    code = defaultCode(statusCode);
    const response = exception.getResponse();
    const body =
      typeof response === 'string'
        ? { message: response }
        : (response as { message?: unknown; code?: unknown; params?: unknown });

    if (Array.isArray(body.message)) {
      code = 'VALIDATION_FAILED';
      message = 'The request is not valid.';
      details = body.message.map(String);
    } else {
      if (typeof body.code === 'string') {
        code = body.code as ErrorCode;
      }
      if (typeof body.params === 'object' && body.params !== null) {
        params = body.params as ErrorParams;
      }
      // Only our own errors' messages: a framework default such as
      // "Cannot GET /x" would describe the server, not the problem.
      if (
        typeof body.code === 'string' &&
        typeof body.message === 'string' &&
        statusCode < 500
      ) {
        message = body.message;
      }
    }
  } else {
    const status = clientErrorStatus(exception);
    if (status !== null) {
      statusCode = status;
      code = defaultCode(status);
    }
  }

  const error = STATUS_CODES[statusCode] ?? 'Error';
  return {
    statusCode,
    error,
    code,
    ...(params ? { params } : {}),
    // A 500's own message may describe internals; the status says enough.
    message: message ?? error,
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
    const requestId = (request as Request & { id?: unknown }).id;
    if (typeof requestId === 'string') {
      body.requestId = requestId;
    }

    if (body.statusCode >= 500 && !(exception instanceof HttpException)) {
      this.logger.error(
        `${request.method} ${request.path} failed`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(body.statusCode).json(body);
  }
}
