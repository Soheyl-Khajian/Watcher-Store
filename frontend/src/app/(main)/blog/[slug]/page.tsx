// frontend/app/(main)/blog/[slug]/page.tsx

import type { Post } from '@/types';
import { fetchPostBySlug } from '@/lib/api/payload';
import { RichText } from '@/components/RichText';
import Image from 'next/image';
import { resolvePayloadMediaUrl } from '@/lib/utils/media';
import { notFound } from 'next/navigation';
import { DEFAULT_AUTHOR_NAME } from '@/lib/content';
import type { Metadata } from 'next';
import { mediaImage, plainText, OPEN_GRAPH_DEFAULTS } from '@/lib/seo';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post: Post | null = await fetchPostBySlug(slug).catch(() => null);
  if (!post) {
    return {};
  }
  const path = `/blog/${encodeURIComponent(post.slug)}`;
  const description = post.excerpt?.trim() || plainText(post.content);
  const image = mediaImage(post.thumbnail);
  return {
    title: post.title,
    description,
    alternates: { canonical: path },
    openGraph: {
      ...OPEN_GRAPH_DEFAULTS,
      type: 'article',
      url: path,
      title: post.title,
      description,
      publishedTime: post.publishedDate,
      authors: [post.authorName?.trim() || DEFAULT_AUTHOR_NAME],
      ...(image ? { images: [image] } : {}),
    },
  };
}

// this component is responsible to show a particular article
export default async function PostPage({ params }: PageProps) {
  const { slug } = await params;
  const post: Post | null = await fetchPostBySlug(slug);

  if (!post) {
    return notFound();
  }

  const authorName = post.authorName?.trim() || DEFAULT_AUTHOR_NAME;

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
        <div className="text-muted-foreground mt-4 flex items-center gap-4">
          <span>توسط {authorName}</span>
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
      <div className="prose prose-lg dark:prose-invert max-w-none">
        <RichText content={post.content} />
      </div>
    </article>
  );
}
