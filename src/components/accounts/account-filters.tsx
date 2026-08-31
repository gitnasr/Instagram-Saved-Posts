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
import type { AccountFilters } from "@/lib/account-filter-params";
import {
  ACCOUNT_FILTERS,
  type AccountFilter,
  type AccountFilterKey,
} from "@/lib/account-filter-defs";
import {
  countActive,
  type DateRange,
  type FilterOption,
  type FilterValue,
  type NumberRange,
} from "@/lib/filter-registry";
import { useAccountFacets } from "@/hooks/use-account-facets";

interface AccountFiltersPanelProps {
  filters: AccountFilters;
  onFiltersChange: (filters: AccountFilters) => void;
}

/** Section order in the panel; anything unlisted falls to the end. */
const GROUP_ORDER = [
  "Identity",
  "Status",
  "Activity",
  "Lost timeline",
  "Saved posts",
  "Timeline",
  "Media",
  "Notes",
];

function groupsOf(registry: readonly AccountFilter[]) {
  const byGroup = new Map<string, AccountFilter[]>();
  for (const d of registry) {
    const key = d.group ?? "Other";
    const list = byGroup.get(key);
    if (list) list.push(d);
    else byGroup.set(key, [d]);
  }
  return [...byGroup.entries()].sort(
    (a, b) =>
      (GROUP_ORDER.indexOf(a[0]) + 1 || 99) - (GROUP_ORDER.indexOf(b[0]) + 1 || 99)
  );
}

export function AccountFiltersPanel({
  filters,
  onFiltersChange,
}: AccountFiltersPanelProps) {
  const activeCount = countActive(filters);
  // Distinct values with live counts, narrowed by the other active filters.
  const { data: facets } = useAccountFacets(filters);

  const update = (key: AccountFilterKey, value: FilterValue | undefined) => {
    const next = { ...filters };
    if (value === undefined) delete next[key];
    else next[key] = value;
    onFiltersChange(next);
  };

  const clearAll = () => onFiltersChange({});

  /** Fixed options, replaced by discovered ones where the registry says so. */
  const optionsFor = (d: AccountFilter): readonly FilterOption[] => {
    if (!d.dynamicOptions) return d.options ?? [];
    const discovered = facets?.[d.key];
    if (!discovered || discovered.length === 0) return d.options ?? [];
    // Union so a known-but-currently-unused status stays selectable.
    const seen = new Set(discovered.map((o) => o.value));
    return [...discovered, ...(d.options ?? []).filter((o) => !seen.has(o.value))];
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative h-10 w-full sm:w-auto"
        >
          <Filter data-icon="inline-start" />
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
      <PopoverContent
        className="max-h-[min(80vh,40rem)] w-[calc(100vw-2rem)] max-w-sm overflow-y-auto"
        align="start"
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Filters</h4>
            {activeCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto px-2 py-1 text-xs"
                onClick={clearAll}
              >
                <X data-icon="inline-start" />
                Clear all
              </Button>
            )}
          </div>

          {groupsOf(ACCOUNT_FILTERS as readonly AccountFilter[]).map(([group, descriptors]) => (
            <div key={group} className="flex flex-col gap-4">
              <Separator />
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {group}
              </p>
              {descriptors.map((d) => (
                <FilterControl
                  key={d.key}
                  descriptor={d}
                  value={filters[d.key as AccountFilterKey]}
                  options={optionsFor(d)}
                  onChange={(v) => update(d.key as AccountFilterKey, v)}
                />
              ))}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface FilterControlProps {
  descriptor: AccountFilter;
  value: FilterValue | undefined;
  options: readonly FilterOption[];
  onChange: (value: FilterValue | undefined) => void;
}

function FilterControl({
  descriptor: d,
  value,
  options,
  onChange,
}: FilterControlProps) {
  const hint = d.hint ? (
    <p className="text-[10px] text-muted-foreground">{d.hint}</p>
  ) : null;

  switch (d.kind) {
    case "boolean":
      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Checkbox
              id={d.key}
              checked={value === true}
              onCheckedChange={(checked) =>
                onChange(checked === true ? true : undefined)
              }
            />
            <Label
              htmlFor={d.key}
              className="cursor-pointer text-xs font-normal"
            >
              {d.label}
            </Label>
          </div>
          {hint}
        </div>
      );

    case "enum":
    case "tristate":
      return (
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium">{d.label}</Label>
          <Select
            value={typeof value === "string" ? value : "any"}
            onValueChange={(v) => onChange(v === "any" ? undefined : v)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                  {o.count != null ? ` (${o.count})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hint}
        </div>
      );

    case "multiEnum": {
      const selected = Array.isArray(value) ? value : [];
      const toggle = (option: string) => {
        const next = selected.includes(option)
          ? selected.filter((v) => v !== option)
          : [...selected, option];
        onChange(next.length > 0 ? next : undefined);
      };
      return (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">{d.label}</Label>
            {selected.length > 0 && (
              <button
                type="button"
                className="text-[10px] text-muted-foreground hover:text-foreground"
                onClick={() => onChange(undefined)}
              >
                Clear
              </button>
            )}
          </div>
          {options.length === 0 ? (
            <p className="text-[10px] text-muted-foreground">
              No values recorded yet.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {options.map((o) => (
                <div key={o.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`${d.key}-${o.value}`}
                    checked={selected.includes(o.value)}
                    onCheckedChange={() => toggle(o.value)}
                  />
                  <Label
                    htmlFor={`${d.key}-${o.value}`}
                    className="cursor-pointer text-xs font-normal"
                  >
                    {o.label}
                    {o.count != null && (
                      <span className="ml-1 text-muted-foreground">
                        ({o.count})
                      </span>
                    )}
                  </Label>
                </div>
              ))}
            </div>
          )}
          {hint}
        </div>
      );
    }

    case "text":
      return (
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium">{d.label}</Label>
          <Input
            className="h-8 text-xs"
            placeholder={d.placeholder}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value || undefined)}
          />
          {hint}
        </div>
      );

    case "number":
      return (
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium">{d.label}</Label>
          <Input
            type="number"
            className="h-8 text-xs"
            placeholder={d.placeholder}
            value={typeof value === "number" ? value : ""}
            onChange={(e) =>
              onChange(e.target.value ? Number(e.target.value) : undefined)
            }
          />
          {hint}
        </div>
      );

    case "numberRange": {
      const v = (value ?? {}) as NumberRange;
      const set = (part: Partial<NumberRange>) => {
        const next = { ...v, ...part };
        const cleaned: NumberRange = {};
        if (next.min != null && !isNaN(next.min)) cleaned.min = next.min;
        if (next.max != null && !isNaN(next.max)) cleaned.max = next.max;
        onChange(cleaned.min == null && cleaned.max == null ? undefined : cleaned);
      };
      return (
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium">{d.label}</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Min"
              min={0}
              className="h-8 text-xs"
              value={v.min ?? ""}
              onChange={(e) =>
                set({ min: e.target.value ? Number(e.target.value) : undefined })
              }
            />
            <span className="text-xs text-muted-foreground">–</span>
            <Input
              type="number"
              placeholder="Max"
              min={0}
              className="h-8 text-xs"
              value={v.max ?? ""}
              onChange={(e) =>
                set({ max: e.target.value ? Number(e.target.value) : undefined })
              }
            />
          </div>
          {hint}
        </div>
      );
    }

    case "dateRange": {
      const v = (value ?? {}) as DateRange;
      const set = (part: Partial<DateRange>) => {
        const next = { ...v, ...part };
        const cleaned: DateRange = {};
        if (next.from) cleaned.from = next.from;
        if (next.to) cleaned.to = next.to;
        onChange(cleaned.from == null && cleaned.to == null ? undefined : cleaned);
      };
      return (
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium">{d.label}</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              className="h-8 text-xs"
              value={v.from ?? ""}
              onChange={(e) => set({ from: e.target.value || undefined })}
            />
            <Input
              type="date"
              className="h-8 text-xs"
              value={v.to ?? ""}
              onChange={(e) => set({ to: e.target.value || undefined })}
            />
          </div>
          <p className="text-[10px] text-muted-foreground">From – To</p>
          {hint}
        </div>
      );
    }

    default:
      return null;
  }
}
