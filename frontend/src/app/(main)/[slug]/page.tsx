// مسیر فایل: frontend/app/(main)/[slug]/page.tsx

import { fetchPageBySlug } from '@/lib/api/payload';
import { notFound } from 'next/navigation';
import { RichText } from '@/components/RichText';
import type { Page } from '@payload-types';

export default async function StaticPage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = await params;

  // ۱. اطلاعات صفحه را بر اساس اسلاگ از CMS دریافت می‌کنیم
  const page: Page | null = await fetchPageBySlug(slug);

  // ۲. اگر صفحه‌ای با این اسلاگ در CMS ما وجود نداشت، صفحه 404 نمایش داده می‌شود
  // این بخش بسیار مهم است تا این صفحه با صفحات دیگر مانند /blog تداخل نکند
  if (!page) {
    return notFound();
  }

  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
      <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-8">
        {page.title}
      </h1>

      {/* ۳. از کامپوننت RichText برای نمایش محتوا استفاده می‌کنیم */}
      <div className="prose prose-lg max-w-none dark:prose-invert">
        <RichText content={page.content ?? []} />
      </div>
    </div>
  );
}
