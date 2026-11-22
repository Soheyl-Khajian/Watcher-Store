// frontend/src/components/errors/not-found-content.tsx
//
// The 404 message, shared by the storefront's not-found pages.

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function NotFoundContent() {
  return (
    <div className="container mx-auto flex flex-col items-center justify-center px-4 py-24 text-center">
      <p className="text-primary text-6xl font-bold" aria-hidden="true">
        ۴۰۴
      </p>
      <h1 className="mt-4 text-2xl font-bold">صفحه مورد نظر پیدا نشد</h1>
      <p className="text-muted-foreground mt-2 max-w-md">
        ممکن است نشانی را اشتباه وارد کرده باشید، یا این صفحه یا محصول دیگر در
        دسترس نباشد.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/">صفحه اصلی</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/products">همه محصولات</Link>
        </Button>
      </div>
    </div>
  );
}
