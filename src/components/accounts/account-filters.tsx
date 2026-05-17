"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Filter, X } from "lucide-react";
import type { AccountFilters } from "@/hooks/use-accounts";

interface AccountFiltersPanelProps {
  filters: AccountFilters;
  onFiltersChange: (filters: AccountFilters) => void;
}

function countActiveFilters(filters: AccountFilters): number {
  let count = 0;
  if (filters.isVerified) count++;
  if (filters.isPrivate) count++;
  if (filters.postCountMin != null) count++;
  if (filters.postCountMax != null) count++;
  if (filters.firstSeenFrom) count++;
  if (filters.firstSeenTo) count++;
  if (filters.lastSeenFrom) count++;
  if (filters.lastSeenTo) count++;
  if (filters.lastScrapeFrom) count++;
  if (filters.lastScrapeTo) count++;
  if (filters.accountStatus) count++;
  if (filters.existsAlso) count++;
  if (filters.searchNotes) count++;
  if (filters.hasNotes) count++;
  return count;
}

export function AccountFiltersPanel({
  filters,
  onFiltersChange,
}: AccountFiltersPanelProps) {
  const activeCount = countActiveFilters(filters);

  const updateFilter = <K extends keyof AccountFilters>(
    key: K,
    value: AccountFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearAll = () => {
    onFiltersChange({});
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Filter className="mr-2 h-4 w-4" />
          Filters
          {activeCount > 0 && (
            <Badge
              variant="secondary"
              className="ml-1.5 h-5 min-w-5 px-1 text-xs"
            >
              {activeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Filters</h4>
            {activeCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto px-2 py-1 text-xs"
                onClick={clearAll}
              >
                <X className="mr-1 h-3 w-3" />
                Clear all
              </Button>
            )}
          </div>

          <Separator />

          {/* Verified filter */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Verified Status</Label>
            <Select
              value={filters.isVerified ?? "any"}
              onValueChange={(val) =>
                updateFilter(
                  "isVerified",
                  val === "any" ? undefined : (val as "true" | "false")
                )
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="true">Verified only</SelectItem>
                <SelectItem value="false">Not verified</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Privacy filter */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Privacy</Label>
            <Select
              value={filters.isPrivate ?? "any"}
              onValueChange={(val) =>
                updateFilter(
                  "isPrivate",
                  val === "any" ? undefined : (val as "true" | "false")
                )
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="true">Private accounts</SelectItem>
                <SelectItem value="false">Public accounts</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Post count range */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Saved Post Count</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Min"
                min={0}
                className="h-8 text-xs"
                value={filters.postCountMin ?? ""}
                onChange={(e) =>
                  updateFilter(
                    "postCountMin",
                    e.target.value ? parseInt(e.target.value) : undefined
                  )
                }
              />
              <span className="text-xs text-muted-foreground">–</span>
              <Input
                type="number"
                placeholder="Max"
                min={0}
                className="h-8 text-xs"
                value={filters.postCountMax ?? ""}
                onChange={(e) =>
                  updateFilter(
                    "postCountMax",
                    e.target.value ? parseInt(e.target.value) : undefined
                  )
                }
              />
            </div>
          </div>

          {/* First seen date range */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">First Discovered</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                className="h-8 text-xs"
                value={filters.firstSeenFrom ?? ""}
                onChange={(e) =>
                  updateFilter("firstSeenFrom", e.target.value || undefined)
                }
              />
              <Input
                type="date"
                className="h-8 text-xs"
                value={filters.firstSeenTo ?? ""}
                onChange={(e) =>
                  updateFilter("firstSeenTo", e.target.value || undefined)
                }
              />
            </div>
            <p className="text-[10px] text-muted-foreground">From – To</p>
          </div>

          {/* Last seen date range */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Last Seen</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                className="h-8 text-xs"
                value={filters.lastSeenFrom ?? ""}
                onChange={(e) =>
                  updateFilter("lastSeenFrom", e.target.value || undefined)
                }
              />
              <Input
                type="date"
                className="h-8 text-xs"
                value={filters.lastSeenTo ?? ""}
                onChange={(e) =>
                  updateFilter("lastSeenTo", e.target.value || undefined)
                }
              />
            </div>
            <p className="text-[10px] text-muted-foreground">From – To</p>
          </div>

          {/* Manual last scrape date range */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Manual Last Scrape</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                className="h-8 text-xs"
                value={filters.lastScrapeFrom ?? ""}
                onChange={(e) =>
                  updateFilter("lastScrapeFrom", e.target.value || undefined)
                }
              />
              <Input
                type="date"
                className="h-8 text-xs"
                value={filters.lastScrapeTo ?? ""}
                onChange={(e) =>
                  updateFilter("lastScrapeTo", e.target.value || undefined)
                }
              />
            </div>
            <p className="text-[10px] text-muted-foreground">From – To</p>
          </div>

          {/* Account details filters */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Current Status</Label>
            <Input
              className="h-8 text-xs"
              placeholder="Filter by status"
              value={filters.accountStatus ?? ""}
              onChange={(e) =>
                updateFilter("accountStatus", e.target.value || undefined)
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Exists Also</Label>
            <Input
              className="h-8 text-xs"
              placeholder="Filter by linked account"
              value={filters.existsAlso ?? ""}
              onChange={(e) =>
                updateFilter("existsAlso", e.target.value || undefined)
              }
            />
          </div>

          <Separator />

          {/* Notes filters */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Notes</Label>
            <div className="flex items-center gap-2">
              <Checkbox
                id="hasNotes"
                checked={filters.hasNotes ?? false}
                onCheckedChange={(checked) =>
                  updateFilter("hasNotes", checked === true ? true : undefined)
                }
              />
              <Label htmlFor="hasNotes" className="text-xs cursor-pointer font-normal">
                Has notes only
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="searchNotes"
                checked={filters.searchNotes ?? false}
                onCheckedChange={(checked) =>
                  updateFilter("searchNotes", checked === true ? true : undefined)
                }
              />
              <Label htmlFor="searchNotes" className="text-xs cursor-pointer font-normal">
                Include notes in search
              </Label>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
