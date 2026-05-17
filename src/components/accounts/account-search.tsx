"use client";

import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
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
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search accounts..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <AccountFiltersPanel
        filters={filters}
        onFiltersChange={onFiltersChange}
      />

      {/* Sort field selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <ArrowUpDown className="mr-2 h-4 w-4" />
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

      {/* Sort direction toggle */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onOrderChange(order === "desc" ? "asc" : "desc")}
        title={order === "desc" ? "Descending – click for ascending" : "Ascending – click for descending"}
      >
        {order === "desc" ? (
          <ArrowDown className="h-4 w-4" />
        ) : (
          <ArrowUp className="h-4 w-4" />
        )}
      </Button>

      <Button variant="outline" size="sm" onClick={onExport}>
        <Download className="mr-2 h-4 w-4" />
        Export CSV
      </Button>
    </div>
  );
}
