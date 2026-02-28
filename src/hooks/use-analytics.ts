"use client";

import { useQuery } from "@tanstack/react-query";
import type { AnalyticsResponse } from "@/types";

export function useAnalytics() {
  return useQuery<AnalyticsResponse>({
    queryKey: ["analytics"],
    queryFn: async () => {
      const res = await fetch("/api/analytics");
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
    staleTime: 30_000,
  });
}
