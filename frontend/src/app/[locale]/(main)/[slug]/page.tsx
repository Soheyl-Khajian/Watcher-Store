// frontend/src/app/[locale]/(main)/[slug]/page.tsx

import { Bidi } from '@/components/ui/bidi';
import { fetchPageBySlug } from '@/lib/api/payload';
import { notFound } from 'next/navigation';
import { RichText } from '@/components/RichText';
import type { Page } from '@payload-types';
import type { Metadata } from 'next';
import { plainText, openGraphDefaults, alternatesFor } from '@/lib/seo';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page: Page | null = await fetchPageBySlug(slug).catch(() => null);
  if (!page) {
    return {};
  }
  const path = `/${encodeURIComponent(page.slug ?? slug)}`;
  const alternates = await alternatesFor(path);
  const description = plainText(page.content);
  return {
    title: page.title,
    ...(description ? { description } : {}),
    alternates,
    openGraph: {
      ...(await openGraphDefaults()),
      url: alternates.canonical,
      title: page.title,
    },
  };
}

export default async function StaticPage({ params }: PageProps) {
  const { slug } = await params;

  // ۱. اطلاعات صفحه را بر اساس اسلاگ از CMS دریافت می‌کنیم
  const page: Page | null = await fetchPageBySlug(slug);

  // ۲. اگر صفحه‌ای با این اسلاگ در CMS ما وجود نداشت، صفحه 404 نمایش داده می‌شود
  // این بخش بسیار مهم است تا این صفحه با صفحات دیگر مانند /blog تداخل نکند
  if (!page) {
    return notFound();
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-8 text-4xl font-extrabold tracking-tight lg:text-5xl">
        <Bidi>{page.title}</Bidi>
      </h1>

      <div className="prose prose-lg dark:prose-invert max-w-none">
        <RichText content={page.content ?? []} />
      </div>
    </div>
  );
}
