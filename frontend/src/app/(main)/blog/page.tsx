// frontend/app/(main)/blog/page.tsx

import { fetchPosts } from '@/lib/api/payload';
import type { Post } from '@/types';
import { PostCard } from '@/components/ui/post-card';

export default async function BlogPage() {
  const posts = await fetchPosts();

  return (
    <div className="container mx-auto py-12">
      <h1 className="mb-8 text-4xl font-bold">وبلاگ</h1>

      {posts && posts.length > 0 ? (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post: Post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <p>هیچ مقاله‌ای برای نمایش وجود ندارد.</p>
      )}
    </div>
  );
}
