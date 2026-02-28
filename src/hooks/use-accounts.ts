"use client";

import { useQuery } from "@tanstack/react-query";
import type { PaginatedResponse, Account } from "@/types";

interface UseAccountsOptions {
  page?: number;
  limit?: number;
  search?: string;
  sort?: "post_count" | "username" | "last_seen";
  order?: "asc" | "desc";
}

export function useAccounts(options: UseAccountsOptions = {}) {
  const {
    page = 1,
    limit = 24,
    search = "",
    sort = "post_count",
    order = "desc",
  } = options;

  return useQuery<PaginatedResponse<Account>>({
    queryKey: ["accounts", { page, limit, search, sort, order }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search,
        sort,
        order,
      });
      const res = await fetch(`/api/accounts?${params}`);
      if (!res.ok) throw new Error("Failed to fetch accounts");
      return res.json();
    },
    staleTime: 60_000,
  });
}
