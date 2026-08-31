"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";
import {
  serializeAccountFilters,
  type AccountFilters,
} from "@/lib/account-filter-params";
import { ACCOUNT_FILTERS } from "@/lib/account-filter-defs";
import { parseFilters, paramNames } from "@/lib/filter-registry";
import {
  scrollDashboardToTop,
  SCROLL_QUERY_PARAM,
} from "@/hooks/use-scroll-url-sync";

const SORT_VALUES = [
  "post_count",
  "username",
  "last_seen",
  "first_seen",
  "verified",
  "lost_at",
] as const;
type SortValue = (typeof SORT_VALUES)[number];

function isSortValue(v: string): v is SortValue {
  return (SORT_VALUES as readonly string[]).includes(v);
}

/** Every query-string key the filter registry owns. */
const FILTER_PARAM_NAMES = ACCOUNT_FILTERS.flatMap(paramNames);

export function useUrlFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const page = Number(searchParams.get("page")) || 1;
  const search = searchParams.get("search") ?? "";
  const sort: SortValue = isSortValue(searchParams.get("sort") ?? "")
    ? (searchParams.get("sort") as SortValue)
    : "post_count";
  const order: "asc" | "desc" =
    searchParams.get("order") === "asc" ? "asc" : "desc";

  // Reading and writing both come from the registry, so a new filter needs no
  // change here — the two halves can no longer drift apart.
  const filters: AccountFilters = useMemo(
    () => parseFilters(ACCOUNT_FILTERS, new URLSearchParams(searchParams.toString())),
    [searchParams]
  );

  const updateUrl = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete(SCROLL_QUERY_PARAM);
      for (const [key, value] of Object.entries(updates)) {
        if (value == null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
      requestAnimationFrame(scrollDashboardToTop);
    },
    [searchParams, router, pathname]
  );

  const setPage = useCallback(
    (p: number | ((prev: number) => number)) => {
      const next = typeof p === "function" ? p(page) : p;
      updateUrl({ page: next === 1 ? undefined : String(next) });
    },
    [updateUrl, page]
  );

  const setSearch = useCallback(
    (value: string) => {
      updateUrl({ search: value || undefined, page: undefined });
    },
    [updateUrl]
  );

  const setSort = useCallback(
    (value: string) => {
      updateUrl({
        sort: value === "post_count" ? undefined : value,
        page: undefined,
      });
    },
    [updateUrl]
  );

  const setOrder = useCallback(
    (value: "asc" | "desc") => {
      updateUrl({
        order: value === "desc" ? undefined : value,
        page: undefined,
      });
    },
    [updateUrl]
  );

  const setFilters = useCallback(
    (newFilters: AccountFilters) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete(SCROLL_QUERY_PARAM);
      params.delete("page");
      // Clear every filter key first, so unsetting one actually removes it.
      for (const name of FILTER_PARAM_NAMES) params.delete(name);
      serializeAccountFilters(newFilters, params);

      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
      requestAnimationFrame(scrollDashboardToTop);
    },
    [searchParams, router, pathname]
  );

  return {
    page,
    search,
    sort,
    order,
    filters,
    setPage,
    setSearch,
    setSort,
    setOrder,
    setFilters,
  };
}
