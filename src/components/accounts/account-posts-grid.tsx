"use client";

import { useState } from "react";
import { PostCard } from "@/components/posts/post-card";
import { PostDetailDialog } from "@/components/posts/post-detail-dialog";
import type { Post } from "@/types";

interface AccountPostsGridProps {
  posts: Post[];
}

export function AccountPostsGrid({ posts }: AccountPostsGridProps) {
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  if (posts.length === 0) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        No saved posts from this account.
      </p>
    );
  }

  return (
    <>
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {posts.map((post) => (
          <PostCard
            key={post.pk}
            post={post}
            onClick={() => setSelectedPost(post)}
          />
        ))}
      </div>

      <PostDetailDialog
        post={selectedPost}
        open={!!selectedPost}
        onOpenChange={(open) => {
          if (!open) setSelectedPost(null);
        }}
      />
    </>
  );
}
