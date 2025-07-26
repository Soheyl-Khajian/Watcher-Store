// src/app/(auth)/register/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { registerUser } from '@/lib/api/payload';
import { toast } from 'sonner';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // از رفرش شدن صفحه جلوگیری می‌کند

    const result = await registerUser({ email, password });

    if (result && !result.errors) {
      toast.success('ثبت‌نام با موفقیت انجام شد! لطفاً وارد شوید.');
      router.push('/login'); // کاربر را به صفحه ورود هدایت می‌کند
    } else {
      // در اینجا می‌توانید پیغام خطای بهتری نمایش دهید
      toast.error('خطا در ثبت‌نام. لطفاً دوباره تلاش کنید.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>ساخت حساب کاربری جدید</CardTitle>
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
              ثبت‌نام
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
