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
import { ArrowUp, ArrowDown, ArrowUpDown, Search, Download } from "lucide-react";
import type { AccountFilters } from "@/hooks/use-accounts";

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
  const activeFilters = useMemo(() => getActiveFilterLabels(filters), [filters]);

  useEffect(() => {
    setDraftSearch(search);
  }, [search]);

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
          >
            <Download data-icon="inline-start" />
            Export CSV
          </Button>
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {activeFilters.map((label) => (
            <Badge key={label} variant="secondary" className="shrink-0">
              {label}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function getActiveFilterLabels(filters: AccountFilters): string[] {
  const labels: string[] = [];

  if (filters.isVerified === "true") labels.push("Verified");
  if (filters.isVerified === "false") labels.push("Not verified");
  if (filters.isPrivate === "true") labels.push("Private");
  if (filters.isPrivate === "false") labels.push("Public");
  if (filters.postCountMin != null || filters.postCountMax != null) {
    labels.push(
      `Posts ${filters.postCountMin ?? 0}-${filters.postCountMax ?? "any"}`
    );
  }
  if (filters.firstSeenFrom || filters.firstSeenTo) {
    labels.push("First discovered");
  }
  if (filters.lastSeenFrom || filters.lastSeenTo) labels.push("Last seen");
  if (filters.lastScrapeFrom || filters.lastScrapeTo) {
    labels.push("Manual scrape date");
  }
  if (filters.accountStatus) labels.push(`Status: ${filters.accountStatus}`);
  if (filters.existsAlso) labels.push(`Exists also: ${filters.existsAlso}`);
  if (filters.hasNotes) labels.push("Has notes");
  if (filters.searchNotes) labels.push("Search notes");

  return labels;
}
