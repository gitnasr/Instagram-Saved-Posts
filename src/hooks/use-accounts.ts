"use client";

import { useQuery } from "@tanstack/react-query";
import type { PaginatedResponse, Account } from "@/types";
import {
  serializeAccountFilters,
  type AccountFilters,
} from "@/lib/account-filter-params";

export type { AccountFilters };

interface UseAccountsOptions {
  page?: number;
  limit?: number;
  search?: string;
  sort?: "post_count" | "username" | "last_seen" | "first_seen" | "verified";
  order?: "asc" | "desc";
  filters?: AccountFilters;
}

export function useAccounts(options: UseAccountsOptions = {}) {
  const {
    page = 1,
    limit = 24,
    search = "",
    sort = "post_count",
    order = "desc",
    filters = {},
  } = options;

  return useQuery<PaginatedResponse<Account>>({
    queryKey: ["accounts", { page, limit, search, sort, order, filters }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search,
        sort,
        order,
      });

      serializeAccountFilters(filters, params);

      const res = await fetch(`/api/accounts?${params}`);
      if (!res.ok) throw new Error("Failed to fetch accounts");
      return res.json();
    },
    staleTime: 60_000,
  });
}
