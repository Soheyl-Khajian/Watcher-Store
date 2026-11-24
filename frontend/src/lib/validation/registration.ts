// frontend/src/lib/validation/registration.ts
//
// Checks a registration form before it is sent. The server checks again;
// this only gives the customer quick, field-level feedback, as messages
// worded in the page's language.

import type { MessageRef } from '@/i18n/messages';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export interface RegistrationForm {
  email: string;
  password: string;
  confirmPassword: string;
}

export type RegistrationErrors = Partial<
  Record<keyof RegistrationForm, MessageRef>
>;

// Deliberately loose: the server has the final say on what an address is.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegistration(
  form: RegistrationForm,
): RegistrationErrors {
  const errors: RegistrationErrors = {};

  if (!EMAIL.test(form.email.trim())) {
    errors.email = { key: 'auth.emailInvalid' };
  }

  if (form.password.length < PASSWORD_MIN_LENGTH) {
    errors.password = {
      key: 'auth.passwordTooShort',
      values: { min: PASSWORD_MIN_LENGTH },
    };
  } else if (form.password.length > PASSWORD_MAX_LENGTH) {
    errors.password = {
      key: 'auth.passwordTooLong',
      values: { max: PASSWORD_MAX_LENGTH },
    };
  }

  if (form.confirmPassword !== form.password) {
    errors.confirmPassword = { key: 'auth.passwordMismatch' };
  }

  return errors;
}
