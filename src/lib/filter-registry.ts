/**
 * A tiny, model-agnostic filter registry.
 *
 * Filters used to be spelled out by hand in seven places — a client-side
 * interface, a serializer, a server-side interface, a parser, a where-builder,
 * the URL hook's read and write halves, and the UI's active-count. They drifted,
 * and the CSV export silently stopped honouring half of them. Now each filter is
 * declared once and every one of those sites is derived from it.
 *
 * A descriptor owns three things: how its value survives a round trip through
 * the query string, how it becomes a Prisma `where` fragment, and how it reads
 * as a chip label.
 */

/** The shapes a filter value can take. */
export type FilterKind =
  | "enum" // one value from a fixed set
  | "multiEnum" // comma-separated subset of a fixed set
  | "text" // free-text substring match
  | "number" // a single number
  | "numberRange" // min/max pair
  | "dateRange" // from/to pair of YYYY-MM-DD strings
  | "tristate" // "yes" | "no"; absent means "either"
  | "boolean"; // a checkbox: present means on, absent means off

export type NumberRange = { min?: number; max?: number };
export type DateRange = { from?: string; to?: string };

export type FilterValue =
  | string
  | string[]
  | number
  | boolean
  | NumberRange
  | DateRange;

/** Values keyed by descriptor key. An absent key means the filter is unset. */
export type FilterValues = Record<string, FilterValue>;

export interface FilterOption {
  value: string;
  label: string;
  /** Populated by the facets endpoint for dynamic option lists. */
  count?: number;
}

export interface FilterDescriptor<TWhere> {
  /** Stable identifier; also the base of its query-string parameter(s). */
  key: string;
  kind: FilterKind;
  /** Shown above the control in the filter panel. */
  label: string;
  /** Groups controls into sections in the UI. */
  group?: string;
  /** Allowed values for `enum` / `multiEnum`. */
  options?: readonly FilterOption[];
  /**
   * Option list is discovered from the data rather than fixed; the facets
   * endpoint supplies the values and their counts.
   */
  dynamicOptions?: boolean;
  /** Placeholder for `text` controls. */
  placeholder?: string;
  /** Extra explanation rendered under the control. */
  hint?: string;
  /**
   * Builds the Prisma `where` fragment. Returning `null` means the value was
   * present but not meaningful (an unparseable number, an empty list), so it is
   * skipped rather than silently matching everything.
   */
  toWhere: (value: FilterValue) => TWhere | null;
  /** Renders the chip text. Defaults to `label: value`. */
  chipLabel?: (value: FilterValue) => string;
}

/** Query-string parameter names owned by a descriptor. */
export function paramNames(d: { key: string; kind: FilterKind }): string[] {
  switch (d.kind) {
    case "numberRange":
      return [`${d.key}Min`, `${d.key}Max`];
    case "dateRange":
      return [`${d.key}From`, `${d.key}To`];
    default:
      return [d.key];
  }
}

/** Reads one descriptor's value out of a query string. */
function parseValue(
  d: { key: string; kind: FilterKind },
  params: URLSearchParams
): FilterValue | undefined {
  switch (d.kind) {
    case "multiEnum": {
      const raw = params.get(d.key);
      if (!raw) return undefined;
      // A single bare value stays valid, so bookmarked URLs keep working.
      const list = raw
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      return list.length > 0 ? list : undefined;
    }
    case "numberRange": {
      const min = params.get(`${d.key}Min`);
      const max = params.get(`${d.key}Max`);
      const value: NumberRange = {};
      if (min && !isNaN(Number(min))) value.min = Number(min);
      if (max && !isNaN(Number(max))) value.max = Number(max);
      return value.min == null && value.max == null ? undefined : value;
    }
    case "dateRange": {
      const from = params.get(`${d.key}From`);
      const to = params.get(`${d.key}To`);
      if (!from && !to) return undefined;
      return { ...(from ? { from } : {}), ...(to ? { to } : {}) };
    }
    case "number": {
      const raw = params.get(d.key);
      if (!raw || isNaN(Number(raw))) return undefined;
      return Number(raw);
    }
    case "boolean": {
      return params.get(d.key) === "true" ? true : undefined;
    }
    default: {
      return params.get(d.key) || undefined;
    }
  }
}

/** Writes one descriptor's value into a query string. Inverse of `parseValue`. */
function serializeValue(
  d: { key: string; kind: FilterKind },
  value: FilterValue | undefined,
  params: URLSearchParams
): void {
  for (const name of paramNames(d)) params.delete(name);
  if (value == null) return;

  switch (d.kind) {
    case "multiEnum": {
      const list = Array.isArray(value) ? value : [String(value)];
      if (list.length > 0) params.set(d.key, list.join(","));
      return;
    }
    case "numberRange": {
      const v = value as NumberRange;
      if (v.min != null) params.set(`${d.key}Min`, String(v.min));
      if (v.max != null) params.set(`${d.key}Max`, String(v.max));
      return;
    }
    case "dateRange": {
      const v = value as DateRange;
      if (v.from) params.set(`${d.key}From`, v.from);
      if (v.to) params.set(`${d.key}To`, v.to);
      return;
    }
    case "boolean": {
      if (value === true) params.set(d.key, "true");
      return;
    }
    default:
      params.set(d.key, String(value));
  }
}

/** Parses every descriptor in a registry out of a query string. */
export function parseFilters<TWhere>(
  registry: readonly FilterDescriptor<TWhere>[],
  params: URLSearchParams
): FilterValues {
  const values: FilterValues = {};
  for (const d of registry) {
    const v = parseValue(d, params);
    if (v !== undefined) values[d.key] = v;
  }
  return values;
}

/** Serializes a value map back onto a query string. */
export function serializeFilters<TWhere>(
  registry: readonly FilterDescriptor<TWhere>[],
  values: FilterValues,
  params: URLSearchParams
): URLSearchParams {
  for (const d of registry) serializeValue(d, values[d.key], params);
  return params;
}

/** Collects the `where` fragment of every filter that is set. */
export function buildWhereFragments<TWhere>(
  registry: readonly FilterDescriptor<TWhere>[],
  values: FilterValues
): TWhere[] {
  const fragments: TWhere[] = [];
  for (const d of registry) {
    const value = values[d.key];
    if (value === undefined) continue;
    const fragment = d.toWhere(value);
    if (fragment) fragments.push(fragment);
  }
  return fragments;
}

/** How many filters are applied — drives the UI's count badge. */
export function countActive(values: FilterValues): number {
  return Object.values(values).filter((v) => v !== undefined).length;
}

function defaultChip<TWhere>(
  d: FilterDescriptor<TWhere>,
  value: FilterValue
): string {
  if (typeof value === "boolean") return d.label;
  if (Array.isArray(value)) {
    const labels = value.map(
      (v) => d.options?.find((o) => o.value === v)?.label ?? v
    );
    return `${d.label}: ${labels.join(", ")}`;
  }
  if (typeof value === "object") {
    const v = value as NumberRange & DateRange;
    const lo = v.min ?? v.from;
    const hi = v.max ?? v.to;
    if (lo != null && hi != null) return `${d.label}: ${lo} – ${hi}`;
    if (lo != null) return `${d.label}: from ${lo}`;
    return `${d.label}: to ${hi}`;
  }
  const opt = d.options?.find((o) => o.value === String(value));
  return `${d.label}: ${opt?.label ?? value}`;
}

/** Chip text for each active filter, in registry order. */
export function activeChips<TWhere>(
  registry: readonly FilterDescriptor<TWhere>[],
  values: FilterValues
): { key: string; label: string }[] {
  const chips: { key: string; label: string }[] = [];
  for (const d of registry) {
    const value = values[d.key];
    if (value === undefined) continue;
    chips.push({
      key: d.key,
      label: d.chipLabel?.(value) ?? defaultChip(d, value),
    });
  }
  return chips;
}
