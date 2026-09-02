"use client";

import { useState, useCallback, useEffect } from "react";
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
    return (
      <div className="flex h-full min-h-[300px] w-full items-center justify-center p-4">
        <Skeleton className="aspect-square w-full max-w-[400px] rounded-lg" />
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="flex h-full min-h-[250px] w-full items-center justify-center text-xs text-muted-foreground">
        No media available
      </div>
    );
  }

  const current = items[currentIndex];

  return (
    <div className="relative flex h-full w-full items-center justify-center select-none">
      {/* Preload other images for instant transitions */}
      <div className="hidden" aria-hidden="true">
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

      {/* Main Slide Media */}
      <div className="relative flex h-full max-h-[46vh] w-full items-center justify-center overflow-hidden md:max-h-[75vh]">
        {current.mediaType === 2 && current.videoUrl ? (
          <video
            key={current.id}
            src={current.cloudinaryUrl ?? proxyImageUrl(current.videoUrl)}
            controls
            playsInline
            className="max-h-[46vh] w-full max-w-full rounded-md object-contain md:max-h-[75vh]"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={current.id}
            src={current.cloudinaryUrl ?? proxyImageUrl(current.mediaUrl)}
            alt={`Slide ${currentIndex + 1} of ${items.length}`}
            className="max-h-[46vh] w-full max-w-full rounded-md object-contain md:max-h-[75vh]"
          />
        )}

        {/* Counter Badge */}
        {items.length > 1 && (
          <div className="absolute right-3 top-3 z-10 rounded-full border border-white/10 bg-black/70 px-2.5 py-1 text-xs font-semibold text-white shadow-md backdrop-blur-md">
            {currentIndex + 1} / {items.length}
          </div>
        )}

        {/* Navigation Arrows */}
        {currentIndex > 0 && (
          <button
            type="button"
            className="absolute left-3 top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/60 text-white shadow-lg backdrop-blur-md transition-all hover:scale-105 hover:bg-black/80 active:scale-95"
            onClick={goPrev}
            aria-label="Previous slide"
          >
            <ChevronLeft className="size-5" />
          </button>
        )}
        {currentIndex < items.length - 1 && (
          <button
            type="button"
            className="absolute right-3 top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/60 text-white shadow-lg backdrop-blur-md transition-all hover:scale-105 hover:bg-black/80 active:scale-95"
            onClick={goNext}
            aria-label="Next slide"
          >
            <ChevronRight className="size-5" />
          </button>
        )}

        {/* Indicator Dots */}
        {items.length > 1 && (
          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/10 bg-black/50 px-3 py-1.5 backdrop-blur-md">
            {items.map((_, idx) => (
              <button
                key={idx}
                type="button"
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  idx === currentIndex
                    ? "w-5 bg-white"
                    : "w-1.5 bg-white/40 hover:bg-white/70"
                }`}
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
