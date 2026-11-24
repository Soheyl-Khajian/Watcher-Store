// src/app/(auth)/register/page.tsx
'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import {
  AuthAlert,
  AuthField,
  AuthSwitchLink,
  fieldA11y,
} from '@/components/auth/auth-form-parts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { loginUser, registerUser } from '@/lib/api/nestjs';
import { useFinishLogin } from '@/lib/hooks/use-finish-login';
import {
  PASSWORD_MAX_LENGTH,
  validateRegistration,
  type RegistrationErrors,
  type RegistrationForm,
} from '@/lib/validation/registration';

const FIELD_ORDER: (keyof RegistrationForm)[] = [
  'email',
  'password',
  'confirmPassword',
];

function RegisterForm() {
  const [form, setForm] = useState<RegistrationForm>({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const finishLogin = useFinishLogin();

  const update = (field: keyof RegistrationForm, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    // A corrected field stops showing its error.
    setErrors((previous) => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const found = validateRegistration(form);
    setErrors(found);
    const firstInvalid = FIELD_ORDER.find((field) => found[field]);
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const credentials = { email: form.email.trim(), password: form.password };
    const registered = await registerUser(credentials);
    if (!registered.ok) {
      setError(registered.message);
      setIsSubmitting(false);
      return;
    }

    // Straight in: no need to type the same password twice more.
    const loggedIn = await loginUser(credentials);
    if (loggedIn.ok) {
      toast.success('حساب کاربری شما ساخته شد. خوش آمدید!');
      await finishLogin(loggedIn.user);
      return;
    }

    // The account exists; only the automatic login failed.
    toast.success('حساب کاربری شما ساخته شد. لطفاً وارد شوید.');
    setError(loggedIn.message);
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <AuthAlert message={error} />

      <AuthField id="email" label="ایمیل" error={errors.email}>
        <Input
          {...fieldA11y('email', errors.email)}
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          dir="ltr"
          placeholder="email@example.com"
          required
          disabled={isSubmitting}
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
        />
      </AuthField>

      <AuthField id="password" label="رمز عبور" error={errors.password}>
        <Input
          {...fieldA11y('password', errors.password)}
          type="password"
          name="password"
          autoComplete="new-password"
          dir="ltr"
          required
          maxLength={PASSWORD_MAX_LENGTH}
          disabled={isSubmitting}
          value={form.password}
          onChange={(e) => update('password', e.target.value)}
        />
      </AuthField>

      <AuthField
        id="confirmPassword"
        label="تکرار رمز عبور"
        error={errors.confirmPassword}
      >
        <Input
          {...fieldA11y('confirmPassword', errors.confirmPassword)}
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          dir="ltr"
          required
          maxLength={PASSWORD_MAX_LENGTH}
          disabled={isSubmitting}
          value={form.confirmPassword}
          onChange={(e) => update('confirmPassword', e.target.value)}
        />
      </AuthField>

      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
      >
        {isSubmitting ? 'در حال ساخت حساب...' : 'ثبت‌نام'}
      </Button>

      <p className="text-muted-foreground text-center text-sm">
        قبلاً ثبت‌نام کرده‌اید؟{' '}
        <AuthSwitchLink href="/login">وارد شوید</AuthSwitchLink>
      </p>
    </form>
  );
}

export default function RegisterPage() {
  return (
    <div className="bg-muted/40 flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>ساخت حساب کاربری جدید</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={null}>
            <RegisterForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
