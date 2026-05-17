"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCarousel } from "@/hooks/use-carousel";
import { proxyImageUrl } from "@/lib/proxy-image";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CarouselViewerProps {
  postPk: string;
}

export function CarouselViewer({ postPk }: CarouselViewerProps) {
  const { data: items, isLoading } = useCarousel(postPk);
  const [currentIndex, setCurrentIndex] = useState(0);

  const goNext = useCallback(() => {
    if (!items) return;
    setCurrentIndex((prev) => (prev < items.length - 1 ? prev + 1 : prev));
  }, [items]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev]);

  if (isLoading) {
    return <Skeleton className="aspect-square w-full rounded-lg" />;
  }

  if (!items || items.length === 0) {
    return null;
  }

  const current = items[currentIndex];

  return (
    <div className="relative">
      {/* Preload all images when carousel opens */}
      <div className="hidden">
        {items.map((item) =>
          item.mediaType !== 2 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={item.id}
              src={item.cloudinaryUrl ?? proxyImageUrl(item.mediaUrl)}
              alt=""
            />
          ) : null
        )}
      </div>

      <div className="relative overflow-hidden rounded-lg bg-muted flex items-center justify-center max-h-[70vh]">
        {current.mediaType === 2 && current.videoUrl ? (
          <video
            key={current.id}
            src={current.cloudinaryUrl ?? proxyImageUrl(current.videoUrl)}
            controls
            className="max-h-[70vh] w-full object-contain"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={current.id}
            src={current.cloudinaryUrl ?? proxyImageUrl(current.mediaUrl)}
            alt={`Slide ${currentIndex + 1} of ${items.length}`}
            className="max-h-[70vh] w-full object-contain"
          />
        )}

        {/* Counter badge */}
        <div className="absolute right-2 top-2 rounded bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
          {currentIndex + 1}/{items.length}
        </div>

        {/* Navigation buttons */}
        {currentIndex > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-black/40 text-white hover:bg-black/60"
            onClick={goPrev}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        {currentIndex < items.length - 1 && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-black/40 text-white hover:bg-black/60"
            onClick={goNext}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Dot indicators */}
      {items.length > 1 && (
        <div className="mt-2 flex justify-center gap-1">
          {items.map((_, idx) => (
            <button
              key={idx}
              className={`h-1.5 rounded-full transition-all ${
                idx === currentIndex
                  ? "w-4 bg-primary"
                  : "w-1.5 bg-muted-foreground/30"
              }`}
              onClick={() => setCurrentIndex(idx)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
