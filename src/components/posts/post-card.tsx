"use client";

import { Card } from "@/components/ui/card";
import { Heart, MessageCircle } from "lucide-react";
import type { Post } from "@/types";

interface PostCardProps {
  post: Post;
  onClick?: () => void;
}

export function PostCard({ post, onClick }: PostCardProps) {
  return (
    <Card
      className="group cursor-pointer overflow-hidden transition-colors hover:bg-accent/50"
      onClick={onClick}
    >
      <div className="relative aspect-square bg-muted">
        {post.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.thumbnailUrl}
            alt={post.captionText?.slice(0, 50) ?? "Post thumbnail"}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            No thumbnail
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center gap-4 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="flex items-center gap-1 text-sm font-semibold text-white">
            <Heart className="h-4 w-4" />
            {post.likeCount}
          </span>
          <span className="flex items-center gap-1 text-sm font-semibold text-white">
            <MessageCircle className="h-4 w-4" />
            {post.commentCount}
          </span>
        </div>
        {post.carouselMediaCount && post.carouselMediaCount > 1 && (
          <div className="absolute right-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">
            1/{post.carouselMediaCount}
          </div>
        )}
      </div>
    </Card>
  );
}
