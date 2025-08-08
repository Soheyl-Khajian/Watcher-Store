// مسیر فایل: src/app/(main)/products/page.tsx
import { fetchAllProducts } from '@/lib/api/payload';
import { ProductCard } from '@/components/ui/product-card';
import type { Product } from '@/types';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

//تابع کمکی برای تبدیل اعداد به فارسی
const toPersianDigits = (num: number) => {
  return new Number(num).toLocaleString('fa-IR', { useGrouping: false });
};

export default async function AllProductsPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; onSale?: string }>;
}) {
  const awaitedSearchParams = await searchParams;
  const page = Number(awaitedSearchParams?.page) || 1;
  const onSale = awaitedSearchParams?.onSale === 'true';

  const data = await fetchAllProducts(page, 15, onSale);

  const products = data?.docs || [];
  const totalPages = data?.totalPages || 1;
  const pageTitle = onSale ? 'محصولات در فروش ویژه' : 'همه محصولات';

  // تابعی برای ساخت لینک‌های صفحه‌بندی با حفظ فیلتر
  const createPageUrl = (p: number) => {
    const params = new URLSearchParams();
    params.set('page', String(p));
    if (onSale) {
      params.set('onSale', 'true');
    }
    return `/products?${params.toString()}`;
  };

  return (
    <div className="container mx-auto py-12">
      <h1 className="text-4xl font-bold mb-8">{pageTitle}</h1>
      {products.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {products.map((product: Product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <div className="mt-12">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href={page > 1 ? createPageUrl(page - 1) : '#'}
                  />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#" isActive>
                    {toPersianDigits(page)}
                  </PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    href={page < totalPages ? createPageUrl(page + 1) : '#'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </>
      ) : (
        <p className="text-center text-muted-foreground">
          محصولی برای نمایش یافت نشد.
        </p>
      )}
    </div>
  );
}
