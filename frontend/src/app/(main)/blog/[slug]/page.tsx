// frontend/app/(main)/blog/[slug]/page.tsx

import { fetchPostBySlug } from '@/lib/api/payload';
import { RichText } from '@/components/RichText';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Post } from '@/types';

// این کامپوننت مسئول نمایش یک مقاله خاص است
export default async function PostPage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = await params;
  const post: Post | null = await fetchPostBySlug(slug);

  // اگر مقاله‌ای با این اسلاگ پیدا نشد، صفحه 404 نمایش داده می‌شود
  if (!post) {
    return notFound();
  }

  const payloadUrl = process.env.NEXT_PUBLIC_PAYLOAD_URL || '';
  const imageUrl = post.thumbnail?.url
    ? `${payloadUrl}${post.thumbnail.url}`
    : '/images/placeholder.png';

  const publishedDate = new Date(post.publishedDate).toLocaleDateString(
    'fa-IR',
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    },
  );

  return (
    <article className="container mx-auto max-w-4xl py-12">
      {/* بخش هدر مقاله */}
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
          {post.title}
        </h1>
        <div className="mt-4 flex items-center space-x-4 space-x-reverse text-muted-foreground">
          <span className="ml-2">توسط {post.authorName}</span>
          <time dateTime={post.publishedDate}>{publishedDate}</time>
        </div>
      </header>

      {/* تصویر شاخص */}
      <div className="relative mb-8 aspect-video w-full overflow-hidden rounded-lg">
        <Image
          src={imageUrl}
          alt={post.title}
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* محتوای اصلی مقاله */}
      <div className="prose prose-lg max-w-none dark:prose-invert">
        <RichText content={post.content} />
      </div>
    </article>
  );
}
