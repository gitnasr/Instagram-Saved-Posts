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
import { Heart, MessageCircle, ExternalLink } from "lucide-react";
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
      return "Unknown";
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Post Details
            <Badge variant="secondary">{mediaTypeLabel(post.mediaType)}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isCarousel ? (
            <CarouselViewer key={post.pk} postPk={post.pk} />
          ) : (
            post.thumbnailUrl && (
              <div className="relative overflow-hidden rounded-lg bg-muted flex items-center justify-center max-h-[70vh]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.cloudinaryThumbnailUrl ?? proxyImageUrl(post.thumbnailUrl)}
                  alt="Post"
                  className="max-h-[70vh] w-full object-contain"
                />
              </div>
            )
          )}

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-sm">
              <Heart className="h-4 w-4" />
              {post.likeCount} likes
            </span>
            <span className="flex items-center gap-1 text-sm">
              <MessageCircle className="h-4 w-4" />
              {post.commentCount} comments
            </span>
          </div>

          {post.captionText && (
            <div className="max-h-32 overflow-y-auto rounded-lg bg-muted p-3">
              <p className="text-sm whitespace-pre-wrap">{post.captionText}</p>
            </div>
          )}

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Posted {format(new Date(post.takenAt * 1000), "MMM d, yyyy")}
            </span>
            {post.carouselMediaCount && (
              <span>{post.carouselMediaCount} slides</span>
            )}
          </div>

          <Button asChild variant="outline" className="w-full">
            <a href={instagramUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              View on Instagram
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
