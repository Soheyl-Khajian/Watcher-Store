// frontend/src/app/[locale]/(auth)/login/page.tsx
'use client';

import { useT } from '@/i18n/client';
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
  const t = useT();
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
      toast.success(t('auth.loggedIn'));
      await finishLogin(result.user);
      return;
    }

    setError(t.error(result.error));
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <AuthAlert message={error} />

      <AuthField id="email" label={t('auth.email')}>
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

      <AuthField id="password" label={t('auth.password')}>
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
        {isSubmitting ? t('auth.loggingIn') : t('auth.loginSubmit')}
      </Button>

      <p className="text-muted-foreground text-center text-sm">
        {t('auth.noAccount')}{' '}
        <AuthSwitchLink href="/register">{t('auth.toRegister')}</AuthSwitchLink>
      </p>
    </form>
  );
}

export default function LoginPage() {
  const t = useT();
  return (
    <div className="bg-muted/40 flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('auth.loginTitle')}</CardTitle>
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
