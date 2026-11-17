"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Toolbar } from "@/components/ui/toolbar";
import { AccountFiltersPanel } from "@/components/accounts/account-filters";
import {
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  CheckSquare,
  Download,
  MoreHorizontal,
  Search,
  X,
} from "lucide-react";
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
  onToggleSelectPage: () => void;
  allOnPageSelected: boolean;
  canSelectPage: boolean;
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
  onToggleSelectPage,
  allOnPageSelected,
  canSelectPage,
}: AccountSearchProps) {
  const [draftSearch, setDraftSearch] = useState(search);
  const [lastSearch, setLastSearch] = useState(search);
  if (search !== lastSearch) {
    setLastSearch(search);
    setDraftSearch(search);
  }

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

  const exportBlocked = filters.ignoredStatus === "ignored";

  return (
    <Toolbar>
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" />
          <Input
            placeholder="Search username, name or tag"
            aria-label="Search accounts"
            value={draftSearch}
            onChange={(e) => setDraftSearch(e.target.value)}
            className="h-9 pl-9 text-sm"
            inputMode="search"
          />
        </div>

        <AccountFiltersPanel filters={filters} onFiltersChange={onFiltersChange} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 text-xs">
              <ArrowUpDown className="size-3.5" />
              <span className="hidden sm:inline">{SORT_LABELS[sort] ?? "Sort"}</span>
              <span className="sr-only sm:hidden">Sort: {SORT_LABELS[sort] ?? "Sort"}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-surface-1 border border-hairline">
            <DropdownMenuRadioGroup value={sort} onValueChange={onSortChange}>
              {Object.entries(SORT_LABELS).map(([value, label]) => (
                <DropdownMenuRadioItem key={value} value={value} className="text-xs">
                  {label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          size="icon-sm"
          className="size-9"
          onClick={() => onOrderChange(order === "desc" ? "asc" : "desc")}
          aria-label={order === "desc" ? "Descending. Switch to ascending" : "Ascending. Switch to descending"}
          title={order === "desc" ? "Descending" : "Ascending"}
        >
          {order === "desc" ? <ArrowDown className="size-3.5" /> : <ArrowUp className="size-3.5" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon-sm" className="size-9" aria-label="More actions">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-surface-1 border border-hairline">
            <DropdownMenuItem
              className="text-xs"
              disabled={!canSelectPage}
              onSelect={onToggleSelectPage}
            >
              <CheckSquare className="size-3.5" />
              {allOnPageSelected ? "Deselect page" : "Select page"}
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs" disabled={exportBlocked} onSelect={onExport}>
              <Download className="size-3.5" />
              {exportBlocked ? "Export CSV (clear the Ignored filter)" : "Export CSV"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {activeFilters.map((chip) => (
            <Badge key={chip.key} variant="secondary" className="shrink-0 gap-1 border-hairline bg-surface-2 py-0.5 text-xs">
              {chip.label}
              <button
                type="button"
                aria-label={`Remove filter ${chip.label}`}
                className="-mr-0.5 rounded-sm opacity-60 transition-colors hover:text-red-400 hover:opacity-100"
                onClick={() => removeFilter(chip.key as AccountFilterKey)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </Toolbar>
  );
}
