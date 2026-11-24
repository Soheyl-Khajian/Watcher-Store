// frontend/src/app/[locale]/(main)/blog/[slug]/page.tsx

import { getFormatter, getT } from '@/i18n/server';
import { Bidi } from '@/components/ui/bidi';
import type { Post } from '@/types';
import { fetchPostBySlug } from '@/lib/api/payload';
import { RichText } from '@/components/RichText';
import Image from 'next/image';
import { mediaSrc } from '@/lib/utils/media';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  mediaImage,
  plainText,
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
  const post: Post | null = await fetchPostBySlug(slug).catch(() => null);
  if (!post) {
    return {};
  }
  const path = `/blog/${encodeURIComponent(post.slug)}`;
  const alternates = await alternatesFor(path);
  const description = post.excerpt?.trim() || plainText(post.content);
  const image = mediaImage(post.thumbnail);
  return {
    title: post.title,
    description,
    alternates,
    openGraph: {
      ...(await openGraphDefaults()),
      type: 'article',
      url: alternates.canonical,
      title: post.title,
      description,
      publishedTime: post.publishedDate,
      authors: [
        post.authorName?.trim() || (await getT())('site.defaultAuthor'),
      ],
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

  const t = await getT();
  const authorName = post.authorName?.trim() || t('site.defaultAuthor');

  const imageUrl = post.thumbnail?.url
    ? mediaSrc(post.thumbnail.url)
    : '/images/placeholder.png';

  const publishedDate = (await getFormatter()).date(post.publishedDate);

  return (
    <article className="container mx-auto max-w-4xl py-12">
      {/*header*/}
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
          <Bidi>{post.title}</Bidi>
        </h1>
        <div className="text-muted-foreground mt-4 flex items-center gap-4">
          <span>
            {t.rich('common.byAuthor', { name: <Bidi>{authorName}</Bidi> })}
          </span>
          <time dateTime={post.publishedDate}>{publishedDate}</time>
        </div>
      </header>

      {/*image*/}
      <div className="relative mb-8 aspect-video w-full overflow-hidden rounded-lg">
        <Image
          src={imageUrl}
          alt={post.title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 768px"
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
