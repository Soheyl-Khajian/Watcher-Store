// frontend/src/lib/validation/registration.ts
//
// Checks a registration form before it is sent. The server checks again;
// this only gives the customer quick, field-level feedback in Persian.

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export interface RegistrationForm {
  email: string;
  password: string;
  confirmPassword: string;
}

export type RegistrationErrors = Partial<
  Record<keyof RegistrationForm, string>
>;

// Deliberately loose: the server has the final say on what an address is.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegistration(
  form: RegistrationForm,
): RegistrationErrors {
  const errors: RegistrationErrors = {};

  if (!EMAIL.test(form.email.trim())) {
    errors.email = 'یک ایمیل معتبر وارد کنید.';
  }

  if (form.password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `رمز عبور باید دست‌کم ${PASSWORD_MIN_LENGTH.toLocaleString('fa-IR')} نویسه باشد.`;
  } else if (form.password.length > PASSWORD_MAX_LENGTH) {
    errors.password = `رمز عبور حداکثر ${PASSWORD_MAX_LENGTH.toLocaleString('fa-IR')} نویسه است.`;
  }

  if (form.confirmPassword !== form.password) {
    errors.confirmPassword = 'تکرار رمز عبور با رمز عبور یکسان نیست.';
  }

  return errors;
}
