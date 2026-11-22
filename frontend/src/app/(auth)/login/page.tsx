// src/app/(auth)/login/page.tsx
'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import {
  AuthAlert,
  AuthField,
  AuthSwitchLink,
} from '@/components/auth/auth-form-parts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { loginUser } from '@/lib/api/nestjs';
import { useFinishLogin } from '@/lib/hooks/use-finish-login';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const finishLogin = useFinishLogin();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    // The server keeps the session in an httpOnly cookie; the page only
    // learns who is logged in.
    const result = await loginUser({ email: email.trim(), password });

    if (result.ok) {
      toast.success('ورود با موفقیت انجام شد!');
      await finishLogin(result.user);
      return;
    }

    setError(result.message);
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <AuthAlert message={error} />

      <AuthField id="email" label="ایمیل">
        <Input
          id="email"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          dir="ltr"
          placeholder="email@example.com"
          required
          disabled={isSubmitting}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </AuthField>

      <AuthField id="password" label="رمز عبور">
        <Input
          id="password"
          type="password"
          name="password"
          autoComplete="current-password"
          dir="ltr"
          required
          disabled={isSubmitting}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </AuthField>

      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting || !email || !password}
        aria-busy={isSubmitting}
      >
        {isSubmitting ? 'در حال ورود...' : 'ورود'}
      </Button>

      <p className="text-muted-foreground text-center text-sm">
        حساب کاربری ندارید؟{' '}
        <AuthSwitchLink href="/register">ثبت‌نام کنید</AuthSwitchLink>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="bg-muted/40 flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>ورود به حساب کاربری</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
