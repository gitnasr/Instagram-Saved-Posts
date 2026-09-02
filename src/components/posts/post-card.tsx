"use client";

import { Card } from "@/components/ui/card";
import { Heart, MessageCircle, Layers } from "lucide-react";
import { proxyImageUrl } from "@/lib/proxy-image";
import type { Post } from "@/types";

interface PostCardProps {
  post: Post;
  onClick?: () => void;
}

export function PostCard({ post, onClick }: PostCardProps) {
  return (
    <Card
      className="group cursor-pointer overflow-hidden rounded-[8px] border border-hairline bg-surface-1 p-0 transition-all hover:border-hairline-strong hover:scale-[1.01]"
      onClick={onClick}
    >
      <div className="relative aspect-square bg-surface-2 overflow-hidden">
        {(post.cloudinaryThumbnailUrl ?? post.thumbnailUrl) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.cloudinaryThumbnailUrl ?? proxyImageUrl(post.thumbnailUrl)}
            alt={post.captionText?.slice(0, 50) ?? "Post thumbnail"}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-ink-subtle font-mono">
            No thumbnail
          </div>
        )}
        
        {/* Subtle inner stroke */}
        <div className="pointer-events-none absolute inset-0 rounded-[8px] ring-1 ring-inset ring-white/10" />

        {/* Hover overlay with engagement stats */}
        <div className="absolute inset-0 flex items-center justify-center gap-4 bg-black/60 opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100">
          <span className="flex items-center gap-1.5 text-xs font-semibold font-mono text-white">
            <Heart className="size-3.5 fill-amber-500 text-amber-500" />
            {post.likeCount.toLocaleString()}
          </span>
          <span className="flex items-center gap-1.5 text-xs font-semibold font-mono text-white">
            <MessageCircle className="size-3.5 fill-white text-white" />
            {post.commentCount.toLocaleString()}
          </span>
        </div>

        {/* Carousel badge indicator */}
        {post.carouselMediaCount && post.carouselMediaCount > 1 && (
          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-[4px] bg-black/70 px-1.5 py-0.5 text-[10px] font-mono font-medium text-white backdrop-blur-xs border border-white/10">
            <Layers className="size-3" />
            <span>1/{post.carouselMediaCount}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
