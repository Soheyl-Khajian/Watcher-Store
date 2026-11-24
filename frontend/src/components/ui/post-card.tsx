// frontend/src/components/ui/post-card.tsx

import { Bidi } from '@/components/ui/bidi';
import type { Post } from '@/types';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { mediaSrc } from '@/lib/utils/media';
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { DEFAULT_AUTHOR_NAME } from '@/lib/content';

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const authorName = post.authorName?.trim() || DEFAULT_AUTHOR_NAME;

  const imageUrl = post.thumbnail?.url
    ? mediaSrc(post.thumbnail.url)
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
    <Link href={`/blog/${post.slug}`} className="group block">
      <Card className="flex h-full flex-col overflow-hidden transition-all duration-300 hover:shadow-lg">
        <CardHeader className="p-0">
          <div className="relative aspect-video w-full">
            <Image
              src={imageUrl}
              alt={post.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          </div>
        </CardHeader>

        <CardContent className="flex-grow p-4">
          <h3 className="text-lg leading-tight font-bold">
            <Bidi>{post.title}</Bidi>
          </h3>
        </CardContent>

        <CardFooter className="text-muted-foreground p-4 pt-0 text-sm">
          <span className="me-1">
            توسط <Bidi>{authorName}</Bidi>
          </span>
          <span>{publishedDate}</span>
        </CardFooter>
      </Card>
    </Link>
  );
}
