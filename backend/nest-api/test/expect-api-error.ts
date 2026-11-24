// backend/nest-api/test/expect-api-error.ts
//
// For tests: asserts that a call fails with one of our coded errors.

import { ApiError, type ErrorCode } from '../src/common/http/api-error';

export function expectApiError(
  call: () => unknown,
  status: number,
  code: ErrorCode,
): void {
  let thrown: unknown;
  try {
    call();
  } catch (error) {
    thrown = error;
  }
  expect(thrown).toBeInstanceOf(ApiError);
  expect((thrown as ApiError).getStatus()).toBe(status);
  expect((thrown as ApiError).code).toBe(code);
}
