"use client";

import { Suspense, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AccountSearch } from "@/components/accounts/account-search";
import { AccountsGrid } from "@/components/accounts/accounts-grid";
import { useAccounts } from "@/hooks/use-accounts";
import { useScrollUrlSync } from "@/hooks/use-scroll-url-sync";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { ChevronLeft, ChevronRight } from "lucide-react";

function AccountsContent() {
  const {
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
  } = useUrlFilters();
  useScrollUrlSync();

  const { data, isLoading } = useAccounts({
    page,
    search,
    sort: sort as
      | "post_count"
      | "username"
      | "last_seen"
      | "first_seen"
      | "verified",
    order,
    filters,
  });

  const handleExport = useCallback(() => {
    const params = new URLSearchParams({ search, sort, order });
    if (filters.isVerified) params.set("isVerified", filters.isVerified);
    if (filters.isPrivate) params.set("isPrivate", filters.isPrivate);
    if (filters.postCountMin != null)
      params.set("postCountMin", String(filters.postCountMin));
    if (filters.postCountMax != null)
      params.set("postCountMax", String(filters.postCountMax));
    if (filters.firstSeenFrom) params.set("firstSeenFrom", filters.firstSeenFrom);
    if (filters.firstSeenTo) params.set("firstSeenTo", filters.firstSeenTo);
    if (filters.lastSeenFrom) params.set("lastSeenFrom", filters.lastSeenFrom);
    if (filters.lastSeenTo) params.set("lastSeenTo", filters.lastSeenTo);
    if (filters.searchNotes) params.set("searchNotes", "true");
    if (filters.hasNotes) params.set("hasNotes", "true");
    window.open(`/api/accounts/export?${params}`, "_blank");
  }, [search, sort, order, filters]);

  return (
    <div className="flex flex-col gap-6">
      <Header
        title="Accounts"
        description={
          data
            ? `${data.pagination.total} unique accounts found`
            : "Loading..."
        }
      />

      <AccountSearch
        search={search}
        onSearchChange={setSearch}
        sort={sort}
        onSortChange={setSort}
        order={order}
        onOrderChange={setOrder}
        filters={filters}
        onFiltersChange={setFilters}
        onExport={handleExport}
      />

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : (
        <>
          <AccountsGrid accounts={data?.items ?? []} />

          {data && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft data-icon="inline-start" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {data.pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
                <ChevronRight data-icon="inline-end" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function AccountsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-full max-w-md" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </div>
      }
    >
      <AccountsContent />
    </Suspense>
  );
}
