"use client";

import { useQuery } from "@tanstack/react-query";
import type { PaginatedResponse, Account } from "@/types";

export interface AccountFilters {
  isVerified?: "true" | "false";
  isPrivate?: "true" | "false";
  postCountMin?: number;
  postCountMax?: number;
  firstSeenFrom?: string;
  firstSeenTo?: string;
  lastSeenFrom?: string;
  lastSeenTo?: string;
  lastScrapeFrom?: string;
  lastScrapeTo?: string;
  accountStatus?: string;
  existsAlso?: string;
  searchNotes?: boolean;
  hasNotes?: boolean;
}

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

      if (filters.isVerified) params.set("isVerified", filters.isVerified);
      if (filters.isPrivate) params.set("isPrivate", filters.isPrivate);
      if (filters.postCountMin != null)
        params.set("postCountMin", String(filters.postCountMin));
      if (filters.postCountMax != null)
        params.set("postCountMax", String(filters.postCountMax));
      if (filters.firstSeenFrom)
        params.set("firstSeenFrom", filters.firstSeenFrom);
      if (filters.firstSeenTo) params.set("firstSeenTo", filters.firstSeenTo);
      if (filters.lastSeenFrom)
        params.set("lastSeenFrom", filters.lastSeenFrom);
      if (filters.lastSeenTo) params.set("lastSeenTo", filters.lastSeenTo);
      if (filters.lastScrapeFrom)
        params.set("lastScrapeFrom", filters.lastScrapeFrom);
      if (filters.lastScrapeTo)
        params.set("lastScrapeTo", filters.lastScrapeTo);
      if (filters.accountStatus)
        params.set("accountStatus", filters.accountStatus);
      if (filters.existsAlso) params.set("existsAlso", filters.existsAlso);
      if (filters.searchNotes) params.set("searchNotes", "true");
      if (filters.hasNotes) params.set("hasNotes", "true");

      const res = await fetch(`/api/accounts?${params}`);
      if (!res.ok) throw new Error("Failed to fetch accounts");
      return res.json();
    },
    staleTime: 60_000,
  });
}
