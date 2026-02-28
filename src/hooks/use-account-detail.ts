"use client";

import { useQuery } from "@tanstack/react-query";
import type { AccountDetailResponse } from "@/types";

export function useAccountDetail(
  username: string,
  page = 1,
  limit = 24
) {
  return useQuery<AccountDetailResponse>({
    queryKey: ["account", username, { page, limit }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      const res = await fetch(`/api/accounts/${username}?${params}`);
      if (!res.ok) throw new Error("Failed to fetch account detail");
      return res.json();
    },
    enabled: !!username,
    staleTime: 60_000,
  });
}
