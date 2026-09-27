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
                'group hover:bg-accent hover:text-accent-foreground flex flex-col items-center gap-3 rounded-lg border p-4 text-center transition-all',
                index >= 4 && 'hidden sm:flex', // <-- این کلاس جادویی است
              )}
            >
              <div className="bg-muted group-hover:bg-primary/10 rounded-full p-3 transition-colors">
                <Icon
                  name={category.icon || 'HelpCircle'}
                  className="text-muted-foreground group-hover:text-primary h-8 w-8 transition-colors"
                />
              </div>
              <p className="text-sm font-semibold">{category.name}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
