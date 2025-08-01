// مسیر فایل: src/components/sections/articles-section.tsx

import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import type { Post } from '@/types';


interface ArticlesSectionProps {
  posts: Post[];
}

export function ArticlesSection({ posts }: ArticlesSectionProps) {
  const payloadUrl = process.env.NEXT_PUBLIC_PAYLOAD_URL || '';

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        {/* ... بخش عنوان ... */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {posts.map((post) => {
            const imageUrl = post.thumbnail?.url
              ? `${payloadUrl}${post.thumbnail.url}`
              : '/images/blog-1.png'; // یک تصویر جایگزین

            return (
              <Link
                href={`/blog/${post.slug}`}
                key={post.id}
                className="group block"
              >
                <Card className="flex h-full flex-col overflow-hidden transition-shadow duration-300 hover:shadow-lg">
                  <CardHeader className="p-0">
                    <div className="relative h-52 w-full">
                      <Image
                        src={imageUrl}
                        alt={post.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, 50vw"
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col flex-grow p-6">
                    <CardTitle className="mb-2 text-xl font-bold">
                      <h3>{post.title}</h3>
                    </CardTitle>
                    <p className="text-muted-foreground flex-grow">
                      {post.excerpt || ''}
                    </p>
                    <div className="mt-4 text-sm font-bold text-primary transition-transform duration-300 group-hover:translate-x-[-4px]">
                      ادامه مطلب &larr;
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}