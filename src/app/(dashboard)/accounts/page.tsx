"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AccountSearch } from "@/components/accounts/account-search";
import { AccountsGrid } from "@/components/accounts/accounts-grid";
import { useAccounts } from "@/hooks/use-accounts";
import { useBulkIgnore } from "@/hooks/use-bulk-ignore";
import { useScrollUrlSync } from "@/hooks/use-scroll-url-sync";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { serializeAccountFilters } from "@/lib/account-filter-params";
import { ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react";
import type { Account } from "@/types";

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
    const params = serializeAccountFilters(
      filters,
      new URLSearchParams({ search, sort, order })
    );
    window.open(`/api/accounts/export?${params}`, "_blank");
  }, [search, sort, order, filters]);

  // ─── Bulk ignore selection ───────────────────────────────
  const [selectedPks, setSelectedPks] = useState<Set<string>>(new Set());
  const { mutate: bulkIgnore, isPending: isBulkPending } = useBulkIgnore();

  const pageAccounts = useMemo(() => data?.items ?? [], [data]);

  // Any change to what the grid is showing invalidates the selection. Adjusted
  // during render rather than in an effect, so no cascading re-render.
  const viewKey = JSON.stringify({ page, search, sort, order, filters });
  const [prevViewKey, setPrevViewKey] = useState(viewKey);
  if (prevViewKey !== viewKey) {
    setPrevViewKey(viewKey);
    setSelectedPks(new Set());
  }

  const toggleSelect = useCallback((account: Account) => {
    setSelectedPks((prev) => {
      const next = new Set(prev);
      if (next.has(account.pk)) {
        next.delete(account.pk);
      } else {
        next.add(account.pk);
      }
      return next;
    });
  }, []);

  const handleBulkIgnore = useCallback(
    (ignored: boolean) => {
      const pks = [...selectedPks];
      bulkIgnore(
        { pks, ignored },
        {
          onSuccess: (result) => {
            toast.success(
              `${result.updated} account${result.updated === 1 ? "" : "s"} ${
                ignored ? "ignored" : "un-ignored"
              }`
            );
            setSelectedPks(new Set());
          },
          onError: (error) => toast.error(error.message),
        }
      );
    },
    [bulkIgnore, selectedPks]
  );

  const handleToggleIgnore = useCallback(
    (account: Account) => {
      const ignored = account.ignoredAt == null;
      bulkIgnore(
        { pks: [account.pk], ignored },
        {
          onSuccess: () =>
            toast.success(
              `@${account.username} ${ignored ? "ignored" : "un-ignored"}`
            ),
          onError: (error) => toast.error(error.message),
        }
      );
    },
    [bulkIgnore]
  );

  const allOnPageSelected =
    pageAccounts.length > 0 &&
    pageAccounts.every((account) => selectedPks.has(account.pk));

  const toggleSelectAllOnPage = useCallback(() => {
    setSelectedPks((prev) => {
      const next = new Set(prev);
      const everySelected = pageAccounts.every((a) => next.has(a.pk));
      for (const account of pageAccounts) {
        if (everySelected) next.delete(account.pk);
        else next.add(account.pk);
      }
      return next;
    });
  }, [pageAccounts]);

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
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSelectAllOnPage}
              disabled={pageAccounts.length === 0}
            >
              {allOnPageSelected ? "Deselect page" : "Select page"}
            </Button>

            {selectedPks.size > 0 && (
              <>
                <span className="text-sm text-muted-foreground">
                  {selectedPks.size} selected
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isBulkPending}
                  onClick={() => handleBulkIgnore(true)}
                >
                  <EyeOff data-icon="inline-start" />
                  Ignore
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isBulkPending}
                  onClick={() => handleBulkIgnore(false)}
                >
                  <Eye data-icon="inline-start" />
                  Un-ignore
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedPks(new Set())}
                >
                  Clear
                </Button>
              </>
            )}
          </div>

          <AccountsGrid
            accounts={pageAccounts}
            selectedPks={selectedPks}
            onToggleSelect={toggleSelect}
            onToggleIgnore={handleToggleIgnore}
          />

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
