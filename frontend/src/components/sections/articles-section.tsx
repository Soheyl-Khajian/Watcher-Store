// frontend/src/components/sections/articles-section.tsx

import { ArrowLeft } from 'lucide-react';
import { getT } from '@/i18n/server';
import { Bidi } from '@/components/ui/bidi';
import type { Post } from '@/types';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { mediaSrc } from '@/lib/utils/media';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ArticlesSectionProps {
  posts: Post[];
}

export async function ArticlesSection({ posts }: ArticlesSectionProps) {
  const t = await getT();
  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {posts.map((post) => {
            const imageUrl = post.thumbnail?.url
              ? mediaSrc(post.thumbnail.url)
              : '/images/placeholder.png';

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
                  <CardContent className="flex flex-grow flex-col p-6">
                    <CardTitle className="mb-2 text-xl font-bold">
                      <h3>
                        <Bidi>{post.title}</Bidi>
                      </h3>
                    </CardTitle>
                    <p className="text-muted-foreground flex-grow">
                      <Bidi>{post.excerpt || ''}</Bidi>
                    </p>
                    <div className="text-primary mt-4 flex items-center gap-1 text-sm font-bold transition-transform duration-300 group-hover:-translate-x-1 ltr:group-hover:translate-x-1">
                      {t('common.readMore')}
                      <ArrowLeft
                        aria-hidden="true"
                        className="h-4 w-4 ltr:-scale-x-100"
                      />
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
