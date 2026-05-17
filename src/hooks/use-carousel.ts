"use client";

import { useQuery } from "@tanstack/react-query";
import type { CarouselMediaItem } from "@/types";

export function useCarousel(postPk: string | null) {
  return useQuery<CarouselMediaItem[]>({
    queryKey: ["carousel", postPk],
    queryFn: async () => {
      const res = await fetch(`/api/posts/${postPk}/carousel`);
      if (!res.ok) throw new Error("Failed to fetch carousel items");
      return res.json();
    },
    enabled: !!postPk,
    staleTime: 300_000,
  });
}
