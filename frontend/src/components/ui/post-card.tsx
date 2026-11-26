// frontend/src/components/ui/post-card.tsx

import { getFormatter, getT } from '@/i18n/server';
import { Bidi } from '@/components/ui/bidi';
import type { Post } from '@/types';
import { Link } from '@/i18n/navigation';
import { FallbackImage } from '@/components/ui/fallback-image';
import { mediaSrc } from '@/lib/utils/media';
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from '@/components/ui/card';

interface PostCardProps {
  post: Post;
}

export async function PostCard({ post }: PostCardProps) {
  const t = await getT();
  const authorName = post.authorName?.trim() || t('site.defaultAuthor');

  const imageUrl = post.thumbnail?.url
    ? mediaSrc(post.thumbnail.url)
    : '/images/placeholder.png';

  const publishedDate = (await getFormatter()).date(post.publishedDate);

  return (
    <Link
      href={`/blog/${encodeURIComponent(post.slug)}`}
      className="group block"
    >
      <Card className="flex h-full flex-col overflow-hidden transition-all duration-300 hover:shadow-lg">
        <CardHeader className="p-0">
          <div className="relative aspect-video w-full">
            <FallbackImage
              src={imageUrl}
              alt={post.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          </div>
        </CardHeader>

        <CardContent className="flex-grow p-4">
          <h2 className="text-lg leading-tight font-bold">
            <Bidi>{post.title}</Bidi>
          </h2>
        </CardContent>

        <CardFooter className="text-muted-foreground p-4 pt-0 text-sm">
          <span className="me-1">
            {t.rich('common.byAuthor', { name: <Bidi>{authorName}</Bidi> })}
          </span>
          <span>{publishedDate}</span>
        </CardFooter>
      </Card>
    </Link>
  );
}
