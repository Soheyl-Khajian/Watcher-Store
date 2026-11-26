// frontend/src/components/sections/category-grid.tsx

import { getT } from '@/i18n/server';
import { Bidi } from '@/components/ui/bidi';
import { Link } from '@/i18n/navigation';
import type { Category } from '@/types';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

interface CategoryGridProps {
  categories: Category[];
}

export async function CategoryGrid({ categories }: CategoryGridProps) {
  if (!categories || categories.length === 0) {
    return null;
  }
  const t = await getT();

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <h2 className="mb-8 text-center text-3xl font-bold">
          {t('home.shopByCategory')}
        </h2>
        {/* Two columns on phones, four on tablets, six on large screens. */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {categories.map((category, index) => (
            <Link
              href={`/categories/${encodeURIComponent(category.slug ?? '')}`}
              key={category.id}
              className={cn(
                'group hover:bg-accent hover:text-accent-foreground flex flex-col items-center gap-3 rounded-lg border p-4 text-center transition-all',
                // Tablets show one full row of four.
                index >= 4 && 'sm:hidden lg:flex',
              )}
            >
              <div className="bg-muted group-hover:bg-primary/10 rounded-full p-3 transition-colors">
                <Icon
                  name={category.icon || 'HelpCircle'}
                  className="text-muted-foreground group-hover:text-primary h-8 w-8 transition-colors"
                />
              </div>
              <p className="text-sm font-semibold">
                <Bidi>{category.name}</Bidi>
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
