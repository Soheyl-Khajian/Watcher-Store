// مسیر فایل: src/components/sections/category-grid.tsx

import Link from 'next/link';
import type { Category } from '@/types';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils'; // cn را برای کلاس‌های شرطی وارد می‌کنیم

interface CategoryGridProps {
  categories: Category[];
}

export function CategoryGrid({ categories }: CategoryGridProps) {
  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <h2 className="mb-8 text-center text-3xl font-bold">
          خرید بر اساس دسته‌بندی
        </h2>
        {/* ۱. گرید رسپانسیو: ۲ ستون در موبایل، ۴ ستون در تبلت، ۶ ستون در دسکتاپ */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {categories.map((category, index) => (
            <Link
              href={`/categories/${category.slug}`}
              key={category.id}
              // ۲. دو آیتم آخر در حالت تبلت (sm) مخفی می‌شوند
              className={cn(
                'group flex flex-col items-center gap-3 rounded-lg border p-4 text-center transition-all hover:bg-accent hover:text-accent-foreground',
                index >= 4 && 'hidden sm:flex', // <-- این کلاس جادویی است
              )}
            >
              <div className="rounded-full bg-muted p-3 transition-colors group-hover:bg-primary/10">
                <Icon
                  name={category.icon || 'HelpCircle'}
                  className="h-8 w-8 text-muted-foreground transition-colors group-hover:text-primary"
                />
              </div>
              <p className="font-semibold text-sm">{category.name}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
