import { describe, expect, it } from 'vitest';
import { inPersian } from '@/test/i18n';
import { validateRegistration } from './registration';

const valid = {
  email: 'new@example.test',
  password: 'long-enough',
  confirmPassword: 'long-enough',
};

describe('validateRegistration', () => {
  it('accepts a complete form', () => {
    expect(validateRegistration(valid)).toEqual({});
  });

  it('accepts an email with surrounding spaces', () => {
    expect(
      validateRegistration({ ...valid, email: '  new@example.test ' }),
    ).toEqual({});
  });

  it.each(['', 'new', 'new@', 'new@example', 'a b@example.test'])(
    'rejects the email %p',
    (email) => {
      expect(validateRegistration({ ...valid, email }).email).toBeTruthy();
    },
  );

  it('requires at least 8 characters', () => {
    const errors = validateRegistration({
      ...valid,
      password: 'short',
      confirmPassword: 'short',
    });
    expect(inPersian(errors.password)).toContain('۸');
  });

  it('rejects absurdly long passwords', () => {
    const long = 'x'.repeat(129);
    expect(
      validateRegistration({ ...valid, password: long, confirmPassword: long })
        .password,
    ).toBeTruthy();
  });

  it('requires the confirmation to match', () => {
    expect(
      validateRegistration({ ...valid, confirmPassword: 'long-enougH' })
        .confirmPassword,
    ).toBeTruthy();
  });
});
