import {
  BadRequestException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { ApiError } from './api-error';
import { toErrorBody } from './error-response.filter';

describe('toErrorBody', () => {
  it('answers our errors with their code, values and message', () => {
    expect(
      toErrorBody(
        new ApiError(HttpStatus.CONFLICT, 'STOCK_LIMIT', 'Only 2 left.', {
          available: 2,
        }),
      ),
    ).toEqual({
      statusCode: 409,
      error: 'Conflict',
      code: 'STOCK_LIMIT',
      params: { available: 2 },
      message: 'Only 2 left.',
    });
  });

  it.each([
    ['an unauthenticated request', new UnauthorizedException(), 'UNAUTHORIZED'],
    ['an unknown route', new NotFoundException('Cannot GET /x'), 'NOT_FOUND'],
    ['the rate limit', new ThrottlerException(), 'RATE_LIMITED'],
  ])('gives %s the general code for its status', (_label, exception, code) => {
    const body = toErrorBody(exception);
    expect(body.code).toBe(code);
    // A framework default would describe the server, not the problem.
    expect(body.message).not.toContain('Cannot GET');
  });

  it('summarises validation errors and keeps them as details', () => {
    const body = toErrorBody(
      new BadRequestException([
        'email must be an email',
        'extra should not exist',
      ]),
    );

    expect(body).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      code: 'VALIDATION_FAILED',
    });
    expect(body.details).toEqual([
      'email must be an email',
      'extra should not exist',
    ]);
  });

  it('turns body-parser errors into their status', () => {
    const tooLarge = Object.assign(new Error('request entity too large'), {
      status: 413,
      type: 'entity.too.large',
    });

    expect(toErrorBody(tooLarge)).toMatchObject({
      statusCode: 413,
      error: 'Payload Too Large',
      code: 'PAYLOAD_TOO_LARGE',
    });
  });

  // Internal details (SQL, stack traces) must never reach the client.
  it('answers an unexpected error with a generic 500', () => {
    const body = toErrorBody(
      new Error('duplicate key value violates unique constraint "x"'),
    );

    expect(body).toEqual({
      statusCode: 500,
      error: 'Internal Server Error',
      code: 'INTERNAL',
      message: 'Internal Server Error',
    });
    expect(JSON.stringify(body)).not.toContain('duplicate key');
  });

  it('keeps the message of our own 500s to the logs', () => {
    const body = toErrorBody(
      new ApiError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'CART_LOAD_FAILED',
        'The cart could not be loaded.',
      ),
    );
    expect(body).toMatchObject({ code: 'CART_LOAD_FAILED' });
    expect(body.message).toBe('Internal Server Error');
  });
});
