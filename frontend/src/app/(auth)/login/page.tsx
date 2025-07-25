// src/app/(auth)/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginUser } from '@/lib/api/nestjs'; // تابع API ورود را وارد می‌کنیم
import { useAuthStore } from '@/lib/store/auth'; // انبار وضعیت را وارد می‌کنیم

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  // دسترسی به توابع store
  const setToken = useAuthStore((state) => state.setToken);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const result = await loginUser({ email, password });

    if (result && result.access_token) {
      // ۱. توکن را در store ذخیره می‌کنیم
      setToken(result.access_token);
      alert('ورود با موفقیت انجام شد!');
      // ۲. کاربر را به صفحه اصلی هدایت می‌کنیم
      router.push('/');
    } else {
      alert('ایمیل یا رمز عبور اشتباه است.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>ورود به حساب کاربری</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">ایمیل</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">رمز عبور</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full">
              ورود
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
