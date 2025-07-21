// مسیر فایل: src/components/sections/articles-section.tsx

import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

// داده‌های آزمایشی برای مقالات
const sampleArticles = [
  {
    slug: 'how-to-choose-cctv',
    title: 'چطور بهترین دوربین را برای خانه انتخاب کنیم؟',
    excerpt:
      'در این راهنمای جامع، تمام نکات کلیدی که قبل از خرید دوربین مداربسته باید بدانید را بررسی می‌کنیم.',
    imageUrl: '/images/blog-1.png',
  },
  {
    slug: 'is-solar-panel-worth-it',
    title: 'آیا پنل خورشیدی در ایران واقعا ارزشمند است؟',
    excerpt:
      'یک بررسی کامل از هزینه‌ها، میزان صرفه‌جویی و بازگشت سرمایه نصب پنل‌های خورشیدی در شرایط ایران.',
    imageUrl: '/images/blog-2.png',
  },
];

export function ArticlesSection() {
  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold">آخرین مقالات و راهنماها</h2>
          <Link
            href="/blog"
            className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            مشاهده همه
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {sampleArticles.map((article) => (
            <Link
              href={`/blog/${article.slug}`}
              key={article.slug}
              className="group block"
            >
              <Card className="flex h-full flex-col overflow-hidden transition-shadow duration-300 hover:shadow-lg">
                <CardHeader className="p-0">
                  <div className="relative h-52 w-full">
                    <Image
                      src={article.imageUrl}
                      alt={article.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, 50vw"
                    />
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col flex-grow p-6">
                  <CardTitle className="mb-2 text-xl font-bold">
                    <h3>{article.title}</h3>
                  </CardTitle>
                  <p className="text-muted-foreground flex-grow">
                    {article.excerpt}
                  </p>
                  <div className="mt-4 text-sm font-bold text-primary transition-transform duration-300 group-hover:translate-x-[-4px]">
                    ادامه مطلب &larr;
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
