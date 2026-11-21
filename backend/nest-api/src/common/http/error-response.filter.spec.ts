import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { toErrorBody } from './error-response.filter';

const PERSIAN = /[؀-ۿ]/;

describe('toErrorBody', () => {
  it('keeps a Persian message written by the code', () => {
    expect(toErrorBody(new ConflictException('موجودی کافی نیست.'))).toEqual({
      statusCode: 409,
      error: 'Conflict',
      message: 'موجودی کافی نیست.',
    });
  });

  it.each([
    ['an English framework default', new UnauthorizedException()],
    ['an English message', new NotFoundException('Cannot GET /x')],
    ['the rate-limit error', new ThrottlerException()],
  ])('replaces %s with a Persian sentence', (_label, exception) => {
    const body = toErrorBody(exception);
    expect(body.message).toMatch(PERSIAN);
    expect(body.message).not.toMatch(/[A-Za-z]{3}/);
  });

  it('summarises validation errors and keeps them as details', () => {
    const body = toErrorBody(
      new BadRequestException([
        'email must be an email',
        'extra should not exist',
      ]),
    );

    expect(body).toMatchObject({ statusCode: 400, error: 'Bad Request' });
    expect(body.message).toMatch(PERSIAN);
    expect(body.details).toEqual([
      'email must be an email',
      'extra should not exist',
    ]);
  });

  it('turns body-parser errors into their status with a Persian message', () => {
    const tooLarge = Object.assign(new Error('request entity too large'), {
      status: 413,
      type: 'entity.too.large',
    });

    expect(toErrorBody(tooLarge)).toMatchObject({
      statusCode: 413,
      error: 'Payload Too Large',
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
      message: expect.stringMatching(PERSIAN),
    });
    expect(JSON.stringify(body)).not.toContain('duplicate key');
  });
});
