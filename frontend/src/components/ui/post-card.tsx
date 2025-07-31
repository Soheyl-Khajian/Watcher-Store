// src/components/ui/post-card.tsx
import Link from 'next/link';
import Image from 'next/image';
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import type { Post } from '@/types';
import clsx from 'clsx';

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  console.log(post);
  const payloadUrl = process.env.NEXT_PUBLIC_PAYLOAD_URL;
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
    <Link href={`/blog/${post.slug}`} className="group block">
      <Card className="flex h-full flex-col overflow-hidden transition-all duration-300 hover:shadow-lg">
        <CardHeader className="p-0">
          <div className="relative aspect-video w-full">
            <Image
              src={imageUrl}
              alt={post.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        </CardHeader>

        <CardContent className="flex-grow p-4">
          <h3 className="text-lg font-bold leading-tight">{post.title}</h3>
        </CardContent>

        <CardFooter className="p-4 pt-0 text-sm text-muted-foreground">
          <span className="ml-1">توسط {post.authorName}</span>
          <span>{publishedDate}</span>
        </CardFooter>
      </Card>
    </Link>
  );
}
