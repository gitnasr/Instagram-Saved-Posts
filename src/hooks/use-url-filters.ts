"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { AccountFilters } from "@/hooks/use-accounts";
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
] as const;
type SortValue = (typeof SORT_VALUES)[number];

function isSortValue(v: string): v is SortValue {
  return (SORT_VALUES as readonly string[]).includes(v);
}

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

  const filters: AccountFilters = useMemo(() => {
    const f: AccountFilters = {};
    const isVerified = searchParams.get("isVerified");
    if (isVerified === "true" || isVerified === "false") f.isVerified = isVerified;
    const isPrivate = searchParams.get("isPrivate");
    if (isPrivate === "true" || isPrivate === "false") f.isPrivate = isPrivate;
    const postCountMin = searchParams.get("postCountMin");
    if (postCountMin != null) f.postCountMin = parseInt(postCountMin);
    const postCountMax = searchParams.get("postCountMax");
    if (postCountMax != null) f.postCountMax = parseInt(postCountMax);
    const firstSeenFrom = searchParams.get("firstSeenFrom");
    if (firstSeenFrom) f.firstSeenFrom = firstSeenFrom;
    const firstSeenTo = searchParams.get("firstSeenTo");
    if (firstSeenTo) f.firstSeenTo = firstSeenTo;
    const lastSeenFrom = searchParams.get("lastSeenFrom");
    if (lastSeenFrom) f.lastSeenFrom = lastSeenFrom;
    const lastSeenTo = searchParams.get("lastSeenTo");
    if (lastSeenTo) f.lastSeenTo = lastSeenTo;
    const lastScrapeFrom = searchParams.get("lastScrapeFrom");
    if (lastScrapeFrom) f.lastScrapeFrom = lastScrapeFrom;
    const lastScrapeTo = searchParams.get("lastScrapeTo");
    if (lastScrapeTo) f.lastScrapeTo = lastScrapeTo;
    const accountStatus = searchParams.get("accountStatus");
    if (accountStatus) f.accountStatus = accountStatus;
    const existsAlso = searchParams.get("existsAlso");
    if (existsAlso) f.existsAlso = existsAlso;
    if (searchParams.get("searchNotes") === "true") f.searchNotes = true;
    if (searchParams.get("hasNotes") === "true") f.hasNotes = true;
    return f;
  }, [searchParams]);

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
      const updates: Record<string, string | undefined> = {
        page: undefined,
        isVerified: newFilters.isVerified ?? undefined,
        isPrivate: newFilters.isPrivate ?? undefined,
        postCountMin:
          newFilters.postCountMin != null
            ? String(newFilters.postCountMin)
            : undefined,
        postCountMax:
          newFilters.postCountMax != null
            ? String(newFilters.postCountMax)
            : undefined,
        firstSeenFrom: newFilters.firstSeenFrom ?? undefined,
        firstSeenTo: newFilters.firstSeenTo ?? undefined,
        lastSeenFrom: newFilters.lastSeenFrom ?? undefined,
        lastSeenTo: newFilters.lastSeenTo ?? undefined,
        lastScrapeFrom: newFilters.lastScrapeFrom ?? undefined,
        lastScrapeTo: newFilters.lastScrapeTo ?? undefined,
        accountStatus: newFilters.accountStatus ?? undefined,
        existsAlso: newFilters.existsAlso ?? undefined,
        searchNotes: newFilters.searchNotes ? "true" : undefined,
        hasNotes: newFilters.hasNotes ? "true" : undefined,
      };
      updateUrl(updates);
    },
    [updateUrl]
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
