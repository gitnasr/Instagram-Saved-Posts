"use client";

import { useQuery } from "@tanstack/react-query";
import type { ScrapeRun } from "@/types";

export function useScrapeHistory() {
  return useQuery<ScrapeRun[]>({
    queryKey: ["scrape-history"],
    queryFn: async () => {
      const res = await fetch("/api/scrape");
      if (!res.ok) throw new Error("Failed to fetch scrape history");
      const data = await res.json();
      return data.history;
    },
    staleTime: 30_000,
  });
}
