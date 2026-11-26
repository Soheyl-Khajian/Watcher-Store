import { Bidi } from '@/components/ui/bidi';
import { getFormatter, getLocale, getT } from '@/i18n/server';
import { fetchProductBySlug } from '@/lib/api/payload';
import { notFound } from 'next/navigation';
import { ProductGallery } from '@/components/ui/product-gallery';
import { RichText } from '@/components/RichText';
import { Check } from 'lucide-react';
import type { Product } from '@payload-types';
import { AddToCartButton } from '@/components/cart/add-to-cart-button';
import { StockNote } from '@/components/ui/stock-note';
import { stockOf } from '@/lib/stock';
import type { Metadata } from 'next';
import { Breadcrumbs, type Crumb } from '@/components/ui/breadcrumbs';
import {
  breadcrumbJsonLd,
  jsonLdString,
  mediaImage,
  plainText,
  productJsonLd,
  openGraphDefaults,
  alternatesFor,
} from '@/lib/seo';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  // The page itself reports a missing product or an outage.
  const product: Product | null = await fetchProductBySlug(slug).catch(
    () => null,
  );
  if (!product) {
    return {};
  }
  const path = `/products/${encodeURIComponent(product.slug ?? slug)}`;
  const alternates = await alternatesFor(path);
  const t = await getT();
  const description =
    plainText(product.description) ||
    t.plain('products.metaDescription', {
      name: product.name,
      site: t('site.name'),
    });
  const image = mediaImage(product.gallery?.[0]?.image);
  return {
    title: product.name,
    description,
    alternates,
    openGraph: {
      ...(await openGraphDefaults()),
      url: alternates.canonical,
      title: product.name,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function ProductDetailsPage({ params }: PageProps) {
  const [format, t] = await Promise.all([getFormatter(), getT()]);
  const { slug } = await params;
  const product: Product | null = await fetchProductBySlug(slug);

  if (!product) {
    return notFound();
  }

  const locale = await getLocale();
  // Home > the product's first category > the product.
  const category = (product.categories ?? []).find(
    (item) => typeof item === 'object' && item !== null && item.slug,
  );
  const crumbs: Crumb[] = [
    { name: t('nav.home'), path: '/' },
    ...(typeof category === 'object' && category?.slug
      ? [
          {
            name: category.name,
            path: `/categories/${encodeURIComponent(category.slug)}`,
          },
        ]
      : []),
    {
      name: product.name,
      path: `/products/${encodeURIComponent(product.slug ?? slug)}`,
    },
  ];

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 md:py-12">
      {/* Price, availability and the page's place in the shop, for search
          results. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdString([
            productJsonLd(product, locale),
            breadcrumbJsonLd(crumbs, locale),
          ]),
        }}
      />
      <Breadcrumbs items={crumbs} className="mb-6" />
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
        <div>
          <ProductGallery
            gallery={product.gallery || []}
            productName={product.name}
          />
        </div>
        <div className="flex flex-col">
          <h1 className="text-3xl font-extrabold tracking-tight lg:text-4xl">
            <Bidi>{product.name}</Bidi>
          </h1>
          <div className="mt-4">
            {product.isOnSale &&
            typeof product.salePrice === 'number' &&
            product.salePrice > 0 ? (
              <div className="flex items-baseline gap-4">
                <p className="text-primary text-2xl font-semibold">
                  {format.toman(product.salePrice)}
                </p>
                <p className="text-muted-foreground text-lg line-through">
                  {format.toman(product.price)}
                </p>
              </div>
            ) : (
              <p className="text-primary text-2xl font-semibold">
                {format.toman(product.price)}
              </p>
            )}
          </div>

          {product.features && product.features.length > 0 && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold">
                {t('products.keyFeatures')}
              </h2>
              <ul className="mt-2 space-y-2">
                {(product.features || []).map((item) => (
                  <li key={item.id} className="flex items-center gap-2">
                    <Check className="text-success h-5 w-5" />
                    <span className="text-muted-foreground">
                      <Bidi>{item.feature}</Bidi>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-8 space-y-3">
            <StockNote stock={stockOf(product)} />
            <AddToCartButton
              productId={product.id}
              productName={product.name}
              inStock={stockOf(product) > 0}
            />
          </div>
        </div>
      </div>
      <div className="mt-16">
        {product.specifications && product.specifications.length > 0 && (
          <section>
            <h2 className="mb-4 border-b pb-2 text-2xl font-bold">
              {t('products.specifications')}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-start">
                <tbody>
                  {(product.specifications || []).map((spec) => (
                    <tr key={spec.id} className="border-b">
                      <th className="bg-muted/50 w-1/3 p-4 font-semibold">
                        <Bidi>{spec.specName}</Bidi>
                      </th>
                      <td className="p-4">
                        <Bidi>{spec.specValue}</Bidi>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        {product.description && (
          <section className="mt-12">
            <h2 className="mb-4 border-b pb-2 text-2xl font-bold">
              {t('products.review')}
            </h2>
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <RichText content={product.description} />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
