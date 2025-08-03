import { fetchProductBySlug } from '@/lib/api/payload';
import { notFound } from 'next/navigation';
import { ProductGallery } from '@/components/ui/product-gallery';
import { RichText } from '@/components/RichText';
import { Check } from 'lucide-react';
import type { Product } from '@payload-types';
import { AddToCartButton } from '@/components/cart/add-to-cart-button';

export default async function ProductDetailsPage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = await params;
  const product: Product | null = await fetchProductBySlug(slug);

  if (!product) {
    return notFound();
  }

  const formattedPrice = new Intl.NumberFormat('fa-IR').format(product.price);

  return (
    <div className="container mx-auto max-w-6xl py-12 px-4">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
        <div>
          <ProductGallery gallery={product.gallery || []} />
        </div>
        <div className="flex flex-col">
          <h1 className="text-3xl font-extrabold tracking-tight lg:text-4xl">
            {product.name}
          </h1>
          <p className="mt-4 text-2xl font-semibold text-primary">
            {formattedPrice} تومان
          </p>

          {product.features && product.features.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold">ویژگی‌های کلیدی:</h3>
              <ul className="mt-2 space-y-2">
                {(product.features || []).map((item) => (
                  <li key={item.id} className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-500" />
                    <span className="text-muted-foreground">
                      {item.feature}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-8">
            <AddToCartButton
              productId={product.id}
              productName={product.name}
            />
          </div>
        </div>
      </div>
      <div className="mt-16">
        {product.specifications && product.specifications.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold border-b pb-2 mb-4">
              مشخصات فنی
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <tbody>
                  {(product.specifications || []).map((spec) => (
                    <tr key={spec.id} className="border-b">
                      <th className="p-4 font-semibold bg-muted/50 w-1/3">
                        {spec.specName}
                      </th>
                      <td className="p-4">{spec.specValue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        {product.description && (
          <section className="mt-12">
            <h2 className="text-2xl font-bold border-b pb-2 mb-4">
              نقد و بررسی
            </h2>
            <div className="prose prose-lg max-w-none dark:prose-invert">
              <RichText content={product.description} />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
