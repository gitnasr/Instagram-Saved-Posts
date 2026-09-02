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
import {
  Heart,
  MessageCircle,
  ExternalLink,
  Layers,
  Calendar,
} from "lucide-react";
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
      <DialogContent className="max-h-[90dvh] max-w-md overflow-hidden border-border/70 p-0 shadow-2xl md:max-w-4xl lg:max-w-5xl">
        <div className="flex h-full max-h-[90dvh] flex-col md:flex-row">
          {/* Left Column: Media Theater */}
          <div className="relative flex min-h-[260px] flex-1 items-center justify-center overflow-hidden bg-black/95 p-2 sm:min-h-[320px] md:min-h-[480px] md:p-4">
            {isCarousel ? (
              <CarouselViewer key={post.pk} postPk={post.pk} />
            ) : post.mediaType === 2 && post.thumbnailUrl ? (
              <div className="relative flex h-full max-h-[46vh] w-full items-center justify-center overflow-hidden md:max-h-[75vh]">
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
            ) : (
              post.thumbnailUrl && (
                <div className="relative flex h-full max-h-[46vh] w-full items-center justify-center overflow-hidden md:max-h-[75vh]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      post.cloudinaryThumbnailUrl ??
                      proxyImageUrl(post.thumbnailUrl)
                    }
                    alt="Post"
                    className="max-h-[46vh] w-full max-w-full rounded-md object-contain md:max-h-[75vh]"
                  />
                </div>
              )
            )}
          </div>

          {/* Right Column: Metadata & Caption Sidebar */}
          <div className="flex w-full flex-col justify-between overflow-y-auto border-t bg-card p-4 sm:p-5 md:w-80 md:border-t-0 md:border-l lg:w-96">
            <div className="space-y-4">
              {/* Header */}
              <DialogHeader className="text-left">
                <div className="flex flex-wrap items-center gap-2 pr-6">
                  <DialogTitle className="text-base font-semibold sm:text-lg">
                    Post Details
                  </DialogTitle>
                  <Badge variant="secondary" className="text-[11px]">
                    {mediaTypeLabel(post.mediaType)}
                  </Badge>
                  {isCarousel && post.carouselMediaCount && (
                    <Badge
                      variant="outline"
                      className="gap-1 text-[11px] text-muted-foreground"
                    >
                      <Layers className="size-3" />
                      {post.carouselMediaCount} slides
                    </Badge>
                  )}
                </div>
              </DialogHeader>

              {/* Engagement Stats */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
                  <Heart className="size-4 text-rose-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold leading-tight">
                      {post.likeCount.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Likes</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
                  <MessageCircle className="size-4 text-sky-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold leading-tight">
                      {post.commentCount.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Comments</p>
                  </div>
                </div>
              </div>

              {/* Caption */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-medium text-muted-foreground">
                  Caption
                </span>
                {post.captionText ? (
                  <div className="max-h-40 overflow-y-auto rounded-lg border bg-muted/30 p-3 text-xs leading-relaxed md:max-h-56">
                    <p className="whitespace-pre-wrap break-words">
                      {post.captionText}
                    </p>
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed p-3 text-xs italic text-muted-foreground">
                    No caption provided
                  </p>
                )}
              </div>

              {/* Timestamp */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="size-3.5 shrink-0" />
                <span>
                  Posted{" "}
                  {format(
                    new Date(post.takenAt * 1000),
                    "MMM d, yyyy · HH:mm"
                  )}
                </span>
              </div>
            </div>

            {/* Action Footer */}
            <div className="pt-4 mt-4 border-t">
              <Button asChild variant="outline" className="w-full gap-2">
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="size-4" />
                  View on Instagram
                </a>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
