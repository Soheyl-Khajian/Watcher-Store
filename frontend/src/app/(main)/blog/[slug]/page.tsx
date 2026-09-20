// frontend/app/(main)/blog/[slug]/page.tsx

import type { Post } from '@/types';
import { fetchPostBySlug } from '@/lib/api/payload';
import { RichText } from '@/components/RichText';
import Image from 'next/image';
import { resolvePayloadMediaUrl } from '@/lib/utils/media';
import { notFound } from 'next/navigation';

type PageProps = {
  params: Promise<{ slug: string }>;
};

// this component is responsible to show a particular article
export default async function PostPage({ params }: PageProps) {
  const { slug } = await params;
  const post: Post | null = await fetchPostBySlug(slug);

  if (!post) {
    return notFound();
  }

  const imageUrl = post.thumbnail?.url
    ? resolvePayloadMediaUrl(post.thumbnail.url)
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
      {/*header*/}
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
          {post.title}
        </h1>
        <div className="mt-4 flex items-center space-x-4 space-x-reverse text-muted-foreground">
          <span className="ml-2">توسط {post.authorName}</span>
          <time dateTime={post.publishedDate}>{publishedDate}</time>
        </div>
      </header>

      {/*image*/}
      <div className="relative mb-8 aspect-video w-full overflow-hidden rounded-lg">
        <Image
          src={imageUrl}
          alt={post.title}
          fill
          unoptimized
          className="object-cover"
          priority
        />
      </div>

      {/*main content*/}
      <div className="prose prose-lg max-w-none dark:prose-invert">
        <RichText content={post.content} />
      </div>
    </article>
  );
}
