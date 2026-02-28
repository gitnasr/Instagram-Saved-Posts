"use client";

import { useQuery } from "@tanstack/react-query";
import type { RunDetailResponse } from "@/types";

export function useRunDetail(runId: number | null) {
  return useQuery<RunDetailResponse>({
    queryKey: ["run-detail", runId],
    queryFn: async () => {
      const res = await fetch(`/api/scrape/${runId}`);
      if (!res.ok) throw new Error("Failed to fetch run detail");
      return res.json();
    },
    enabled: runId !== null,
    staleTime: 30_000,
  });
}
