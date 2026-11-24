// frontend/src/app/[locale]/(main)/blog/page.tsx

import { alternatesFor } from '@/lib/seo';
import { getT } from '@/i18n/server';
import { fetchPosts } from '@/lib/api/payload';
import type { Post } from '@/types';
import { PostCard } from '@/components/ui/post-card';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t('blog.title'),
    description: t('blog.description'),
    alternates: await alternatesFor('/blog'),
  };
}

export default async function BlogPage() {
  const t = await getT();
  const posts = await fetchPosts();

  return (
    <div className="container mx-auto py-12">
      <h1 className="mb-8 text-4xl font-bold">{t('blog.title')}</h1>

      {posts && posts.length > 0 ? (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post: Post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <p>{t('blog.empty')}</p>
      )}
    </div>
  );
}
