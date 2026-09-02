"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CarouselViewer } from "@/components/posts/carousel-viewer";
import { Heart, MessageCircle, ExternalLink, Calendar, Layers } from "lucide-react";
import { proxyImageUrl } from "@/lib/proxy-image";
import { format } from "date-fns";
import type { Post } from "@/types";

interface PostDetailDialogProps {
  post: Post | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function mediaTypeLabel(type: number) {
  switch (type) {
    case 1:
      return "Photo";
    case 2:
      return "Video";
    case 8:
      return "Carousel";
    default:
      return "Post";
  }
}

export function PostDetailDialog({
  post,
  open,
  onOpenChange,
}: PostDetailDialogProps) {
  if (!post) return null;

  const instagramUrl = `https://www.instagram.com/p/${post.code}/`;
  const isCarousel =
    post.carouselMediaCount != null && post.carouselMediaCount > 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-surface-1 border border-hairline rounded-[8px] p-5">
        <DialogHeader className="pb-2 border-b border-hairline">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            Post Archive
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
              {mediaTypeLabel(post.mediaType)}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {isCarousel ? (
            <CarouselViewer key={post.pk} postPk={post.pk} />
          ) : (
            post.thumbnailUrl && (
              <div className="relative overflow-hidden rounded-[6px] bg-surface-2 border border-hairline flex items-center justify-center max-h-[70vh]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    post.cloudinaryThumbnailUrl ??
                    proxyImageUrl(post.thumbnailUrl)
                  }
                  alt="Post preview"
                  className="max-h-[46vh] w-full max-w-full rounded-md object-contain md:max-h-[75vh]"
                />
              </div>
            )
          )}

          {/* Stats Bar */}
          <div className="flex items-center justify-between p-2.5 rounded-[6px] bg-surface-2/60 border border-hairline">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-xs font-semibold font-mono text-ink">
                <Heart className="size-3.5 text-amber-500 fill-amber-500" />
                {post.likeCount.toLocaleString()} likes
              </span>
              <span className="flex items-center gap-1.5 text-xs font-semibold font-mono text-ink">
                <MessageCircle className="size-3.5 text-ink-muted" />
                {post.commentCount.toLocaleString()} comments
              </span>
            </div>
            {post.carouselMediaCount && (
              <span className="flex items-center gap-1 text-[11px] font-mono text-ink-muted">
                <Layers className="size-3" />
                {post.carouselMediaCount} slides
              </span>
            )}
          </div>

          {/* Caption */}
          {post.captionText && (
            <div className="max-h-36 overflow-y-auto rounded-[6px] bg-surface-2/40 border border-hairline p-3">
              <p className="text-xs text-ink whitespace-pre-wrap leading-relaxed">
                {post.captionText}
              </p>
            </div>
          )}

          {/* Date */}
          <div className="flex items-center justify-between text-xs text-ink-subtle font-mono">
            <span className="flex items-center gap-1">
              <Calendar className="size-3" />
              Posted {format(new Date(post.takenAt * 1000), "MMM d, yyyy · HH:mm")}
            </span>
          </div>

          {/* Instagram Link CTA */}
          <Button asChild variant="outline" className="w-full text-xs font-semibold border-hairline hover:bg-surface-2">
            <a href={instagramUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1.5 size-3.5" />
              Open Original on Instagram
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
