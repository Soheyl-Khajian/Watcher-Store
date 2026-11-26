// frontend/src/app/[locale]/(main)/blog/page.tsx

import { alternatesFor } from '@/lib/seo';
import { getT } from '@/i18n/server';
import { fetchPostsPage } from '@/lib/api/payload';
import type { Post } from '@/types';
import { PostCard } from '@/components/ui/post-card';
import { Pager } from '@/components/ui/pager';
import { parsePage } from '@/lib/utils/pagination';
import type { Metadata } from 'next';

type BlogSearchParams = Promise<{ page?: string }>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: BlogSearchParams;
}): Promise<Metadata> {
  const t = await getT();
  // Each page of the blog is its own page for search engines.
  const page = parsePage((await searchParams)?.page);
  return {
    title: t('blog.title'),
    description: t('blog.description'),
    alternates: await alternatesFor(page > 1 ? `/blog?page=${page}` : '/blog'),
  };
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams?: BlogSearchParams;
}) {
  const t = await getT();
  const page = parsePage((await searchParams)?.page);
  const data = await fetchPostsPage({ page });
  const posts: Post[] = data?.docs ?? [];
  const totalPages: number = data?.totalPages ?? 1;

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="mb-8 text-4xl font-bold">{t('blog.title')}</h1>

      {posts.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
          <div className="mt-12">
            <Pager page={page} totalPages={totalPages} href="/blog" />
          </div>
        </>
      ) : (
        <p>{t('blog.empty')}</p>
      )}
    </div>
  );
}
