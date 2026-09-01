"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AccountFiltersPanel } from "@/components/accounts/account-filters";
import { ArrowUp, ArrowDown, ArrowUpDown, Search, Download, X } from "lucide-react";
import type { AccountFilters } from "@/hooks/use-accounts";
import {
  ACCOUNT_FILTERS,
  type AccountFilter,
  type AccountFilterKey,
} from "@/lib/account-filter-defs";
import { activeChips } from "@/lib/filter-registry";

interface AccountSearchProps {
  search: string;
  onSearchChange: (value: string) => void;
  sort: string;
  onSortChange: (value: string) => void;
  order: "asc" | "desc";
  onOrderChange: (value: "asc" | "desc") => void;
  filters: AccountFilters;
  onFiltersChange: (filters: AccountFilters) => void;
  onExport: () => void;
}

const SORT_LABELS: Record<string, string> = {
  post_count: "Post Count",
  username: "Username",
  last_seen: "Last Scraped",
  first_seen: "First Discovered",
  verified: "Verified",
  lost_at: "Went Missing",
};

export function AccountSearch({
  search,
  onSearchChange,
  sort,
  onSortChange,
  order,
  onOrderChange,
  filters,
  onFiltersChange,
  onExport,
}: AccountSearchProps) {
  const [draftSearch, setDraftSearch] = useState(search);
  // Re-sync the draft when the committed search changes underneath us (a
  // cleared chip, a back navigation). Adjusting during render rather than in
  // an effect keeps it to a single render pass, with no frame showing the
  // stale draft. See https://react.dev/reference/react/useState#storing-information-from-previous-renders
  const [lastSearch, setLastSearch] = useState(search);
  if (search !== lastSearch) {
    setLastSearch(search);
    setDraftSearch(search);
  }
  // Chip labels come from the same registry that defines the filters, so a new
  // filter shows up here without a parallel list to keep in step.
  const activeFilters = useMemo(
    () => activeChips(ACCOUNT_FILTERS as readonly AccountFilter[], filters),
    [filters]
  );

  const removeFilter = (key: AccountFilterKey) => {
    const next = { ...filters };
    delete next[key];
    onFiltersChange(next);
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (draftSearch !== search) {
        onSearchChange(draftSearch);
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [draftSearch, onSearchChange, search]);

  return (
    <div className="sticky top-0 z-20 -mx-4 flex flex-col gap-3 border-y bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-lg sm:border md:top-0">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search accounts..."
            value={draftSearch}
            onChange={(e) => setDraftSearch(e.target.value)}
            className="h-10 pl-9"
            inputMode="search"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <AccountFiltersPanel
            filters={filters}
            onFiltersChange={onFiltersChange}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-10 w-full sm:w-auto"
              >
                <ArrowUpDown data-icon="inline-start" />
                {SORT_LABELS[sort] ?? "Sort"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup value={sort} onValueChange={onSortChange}>
                <DropdownMenuRadioItem value="post_count">Post Count</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="username">Username</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="last_seen">Last Scraped</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="first_seen">First Discovered</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="verified">Verified</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="lost_at">Went Missing</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="sm"
            className="h-10 w-full sm:w-auto"
            onClick={() => onOrderChange(order === "desc" ? "asc" : "desc")}
            title={
              order === "desc"
                ? "Descending, click for ascending"
                : "Ascending, click for descending"
            }
          >
            {order === "desc" ? (
              <ArrowDown data-icon="inline-start" />
            ) : (
              <ArrowUp data-icon="inline-start" />
            )}
            {order === "desc" ? "Desc" : "Asc"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="col-span-2 h-10 w-full sm:col-span-1 sm:w-auto"
            onClick={onExport}
            disabled={filters.ignoredStatus === "ignored"}
            title={
              filters.ignoredStatus === "ignored"
                ? "Ignored accounts are never exported — clear the Ignored filter"
                : "Export the filtered accounts, excluding ignored ones"
            }
          >
            <Download data-icon="inline-start" />
            Export CSV
          </Button>
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {activeFilters.map((chip) => (
            <Badge key={chip.key} variant="secondary" className="shrink-0 gap-1">
              {chip.label}
              <button
                type="button"
                aria-label={`Remove filter ${chip.label}`}
                className="-mr-0.5 rounded-sm opacity-60 hover:opacity-100"
                onClick={() => removeFilter(chip.key as AccountFilterKey)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
