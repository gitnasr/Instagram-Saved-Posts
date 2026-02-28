"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import type { ScrapeStatusResponse } from "@/types";

export function useScrapeStatus() {
  return useQuery<ScrapeStatusResponse>({
    queryKey: ["scrape-status"],
    queryFn: async () => {
      const res = await fetch("/api/scrape");
      if (!res.ok) throw new Error("Failed to fetch scrape status");
      return res.json();
    },
    refetchInterval: (query) => {
      const data = query.state.data as ScrapeStatusResponse | undefined;
      return data?.current?.status === "running" ? 2000 : false;
    },
    staleTime: 5_000,
  });
}

export function useTriggerScrape() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/scrape", { method: "POST" });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to trigger scrape");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scrape-status"] });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}
