/**
 * Every account filter, declared once.
 *
 * Client-safe: this module must not import Prisma's runtime, only its types,
 * so the filter panel and the URL hook can share it with the API routes.
 */
import type { Prisma } from "@prisma/client";
import type {
  DateRange,
  FilterDescriptor,
  FilterValue,
  NumberRange,
} from "./filter-registry";
import { ACCOUNT_STATUS_OPTIONS } from "./account-metadata";
import { MEDIA_TYPE_OPTIONS } from "./post-filter-defs";
import { EVENT_TYPE_OPTIONS } from "./event-filter-defs";

type Where = Prisma.AccountWhereInput;
type AccountFilter = FilterDescriptor<Where>;

const insensitive = { mode: "insensitive" } as const;

/**
 * In MongoDB a field never written is "missing" rather than null, so an
 * is-empty check has to cover both states.
 */
export function nullOrMissing(field: keyof Prisma.AccountWhereInput): Where {
  return {
    OR: [{ [field]: null }, { [field]: { isSet: false } }],
  } as Where;
}

function isSetWhere(field: keyof Prisma.AccountWhereInput): Where {
  return { [field]: { not: null } } as Where;
}

/** Shared "has a value / has none" filter, used by several columns. */
function tristate<K extends string>(
  key: K,
  label: string,
  field: keyof Prisma.AccountWhereInput,
  group: string,
  labels: { yes: string; no: string },
  hint?: string
): AccountFilter & { key: K } {
  return {
    key,
    kind: "tristate",
    label,
    group,
    hint,
    options: [
      { value: "yes", label: labels.yes },
      { value: "no", label: labels.no },
    ],
    toWhere: (v) =>
      v === "yes" ? isSetWhere(field) : v === "no" ? nullOrMissing(field) : null,
  };
}

/**
 * Timestamps are ISO strings compared lexicographically, so an inclusive end
 * date needs the end-of-day suffix. `lastScrapeOn` is stored as a bare
 * YYYY-MM-DD and is therefore excluded from this treatment.
 */
function isoDateRange<K extends string>(
  key: K,
  label: string,
  field: keyof Prisma.AccountWhereInput,
  group: string,
  hint?: string
): AccountFilter & { key: K } {
  return {
    key,
    kind: "dateRange",
    label,
    group,
    hint,
    toWhere: (v) => {
      const { from, to } = v as DateRange;
      const clause: Record<string, string> = {};
      if (from) clause.gte = from;
      if (to) clause.lte = `${to}T23:59:59`;
      return Object.keys(clause).length > 0
        ? ({ [field]: clause } as Where)
        : null;
    },
  };
}

function textFilter<K extends string>(
  key: K,
  label: string,
  field: keyof Prisma.AccountWhereInput,
  group: string,
  placeholder: string
): AccountFilter & { key: K } {
  return {
    key,
    kind: "text",
    label,
    group,
    placeholder,
    toWhere: (v) =>
      String(v).trim()
        ? ({ [field]: { contains: String(v), ...insensitive } } as Where)
        : null,
  };
}

export const ACCOUNT_FILTERS = [
  // ── Identity ────────────────────────────────────────────────────────
  {
    key: "isVerified",
    kind: "enum",
    label: "Verified Status",
    group: "Identity",
    options: [
      { value: "true", label: "Verified only" },
      { value: "false", label: "Not verified" },
    ],
    toWhere: (v) =>
      v === "true"
        ? { isVerified: true }
        : v === "false"
          ? { isVerified: false }
          : null,
  },
  {
    key: "isPrivate",
    kind: "enum",
    label: "Privacy",
    group: "Identity",
    options: [
      { value: "true", label: "Private accounts" },
      { value: "false", label: "Public accounts" },
    ],
    toWhere: (v) =>
      v === "true"
        ? { isPrivate: true }
        : v === "false"
          ? { isPrivate: false }
          : null,
  },
  textFilter("fullName", "Full Name", "fullName", "Identity", "Match full name"),

  // ── Status ──────────────────────────────────────────────────────────
  {
    key: "accountStatus",
    kind: "multiEnum",
    label: "Current Status",
    group: "Status",
    dynamicOptions: true,
    hint: '"Private Account" is set automatically by the scraper; the rest are yours.',
    options: ACCOUNT_STATUS_OPTIONS.map((s) => ({ value: s, label: s })),
    toWhere: (v) => {
      const list = (Array.isArray(v) ? v : [String(v)]).filter(Boolean);
      return list.length > 0 ? { accountStatus: { in: list } } : null;
    },
  },
  tristate(
    "hasStatus",
    "Has Any Status",
    "accountStatus",
    "Status",
    { yes: "Status set", no: "No status" }
  ),
  {
    key: "existsAlso",
    kind: "multiEnum",
    label: "Exists Also",
    group: "Status",
    dynamicOptions: true,
    options: [],
    toWhere: (v) => {
      const list = (Array.isArray(v) ? v : [String(v)]).filter(Boolean);
      return list.length > 0 ? { existsAlso: { in: list } } : null;
    },
  },
  tristate(
    "hasExistsAlso",
    "Has Linked Account",
    "existsAlso",
    "Status",
    { yes: "Linked elsewhere", no: "Not linked" }
  ),
  {
    key: "lostStatus",
    kind: "multiEnum",
    label: "Lost Status",
    group: "Status",
    options: [
      { value: "lost", label: "Currently lost" },
      { value: "recovered", label: "Recovered" },
      { value: "never", label: "Never lost" },
    ],
    toWhere: (v) => {
      const list = Array.isArray(v) ? v : [String(v)];
      // Each selection is its own shape, so a multi-select ORs them together.
      const clauses: Where[] = [];
      if (list.includes("lost")) clauses.push({ lostAt: { not: null } });
      if (list.includes("recovered")) {
        clauses.push({
          AND: [nullOrMissing("lostAt"), { recoveredAt: { not: null } }],
        });
      }
      if (list.includes("never")) {
        clauses.push({
          AND: [nullOrMissing("lostAt"), nullOrMissing("recoveredAt")],
        });
      }
      if (clauses.length === 0) return null;
      return clauses.length === 1 ? clauses[0] : { OR: clauses };
    },
  },
  {
    key: "ignoredStatus",
    kind: "enum",
    label: "Ignored",
    group: "Status",
    hint: "Ignored accounts are always left out of the CSV export.",
    options: [
      { value: "ignored", label: "Ignored only" },
      { value: "active", label: "Not ignored" },
    ],
    toWhere: (v) =>
      v === "ignored"
        ? { ignoredAt: { not: null } }
        : v === "active"
          ? nullOrMissing("ignoredAt")
          : null,
  },

  // ── Activity ────────────────────────────────────────────────────────
  {
    key: "postCount",
    kind: "numberRange",
    label: "Saved Post Count",
    group: "Activity",
    toWhere: (v) => {
      const { min, max } = v as NumberRange;
      const clause: Record<string, number> = {};
      if (min != null) clause.gte = min;
      if (max != null) clause.lte = max;
      return Object.keys(clause).length > 0 ? { savedPostCount: clause } : null;
    },
  },
  isoDateRange("firstSeen", "First Discovered", "firstSeenAt", "Activity"),
  isoDateRange("lastSeen", "Last Seen", "lastSeenAt", "Activity"),
  {
    key: "lastScrape",
    kind: "dateRange",
    label: "Manual Last Scrape",
    group: "Activity",
    // Stored as a bare YYYY-MM-DD, so no end-of-day suffix is needed.
    toWhere: (v) => {
      const { from, to } = v as DateRange;
      const clause: Record<string, string> = {};
      if (from) clause.gte = from;
      if (to) clause.lte = to;
      return Object.keys(clause).length > 0 ? { lastScrapeOn: clause } : null;
    },
  },
  tristate(
    "neverScraped",
    "Manual Scrape",
    "lastScrapeOn",
    "Activity",
    { yes: "Scraped manually", no: "Never scraped" }
  ),
  {
    key: "discoveredInRunId",
    kind: "number",
    label: "Discovered In Run",
    group: "Activity",
    placeholder: "Run number",
    dynamicOptions: true,
    toWhere: (v) => {
      const id = Number(v);
      return Number.isFinite(id) ? { discoveredInRunId: id } : null;
    },
    chipLabel: (v) => `Discovered in run #${v}`,
  },

  // ── Lost timeline ───────────────────────────────────────────────────
  isoDateRange("lostAt", "Went Missing", "lostAt", "Lost timeline"),
  isoDateRange("recoveredAt", "Recovered", "recoveredAt", "Lost timeline"),
  isoDateRange(
    "statusChanged",
    "Status Changed",
    "statusChangedAt",
    "Lost timeline"
  ),

  // ── Media ───────────────────────────────────────────────────────────
  tristate(
    "hasProfilePic",
    "Profile Picture",
    "profilePicUrl",
    "Media",
    { yes: "Has a picture", no: "Missing" }
  ),
  tristate(
    "hasCloudinaryPic",
    "Cloudinary Backup",
    "cloudinaryProfilePicUrl",
    "Media",
    { yes: "Backed up", no: "Not backed up" },
    "Finds accounts the Cloudinary sync has not reached yet."
  ),

  // ── Saved posts ─────────────────────────────────────────────────────
  // Resolved against the posts collection via resolvePostFilterContext; Mongo
  // cannot join, so toWhere contributes nothing here.
  {
    key: "postMediaType",
    kind: "multiEnum",
    label: "Has Saved Post Of Type",
    group: "Saved posts",
    options: MEDIA_TYPE_OPTIONS,
    toWhere: () => null,
  },
  {
    key: "postTaken",
    kind: "dateRange",
    label: "Saved Post Published",
    group: "Saved posts",
    hint: "Matches accounts with at least one saved post published in this range.",
    toWhere: () => null,
  },

  // ── Timeline ────────────────────────────────────────────────────────
  // Resolved against accountEvents, same reason as above.
  {
    key: "eventType",
    kind: "multiEnum",
    label: "Timeline Event",
    group: "Timeline",
    options: EVENT_TYPE_OPTIONS,
    toWhere: () => null,
  },
  {
    key: "event",
    kind: "dateRange",
    label: "Event Occurred",
    group: "Timeline",
    hint: "Narrows the timeline event filter to a date range.",
    toWhere: () => null,
  },

  // ── Notes ───────────────────────────────────────────────────────────
  // Both are resolved against the separate accountNotes collection, which
  // Mongo cannot join, so their where-fragments come from the note context in
  // buildAccountWhere rather than from toWhere here.
  {
    key: "hasNotes",
    kind: "boolean",
    label: "Has notes only",
    group: "Notes",
    toWhere: () => null,
  },
  {
    key: "searchNotes",
    kind: "boolean",
    label: "Include notes in search",
    group: "Notes",
    toWhere: () => null,
  },
] as const satisfies readonly AccountFilter[];

/** Every valid filter key, so a typo anywhere is a compile error. */
export type AccountFilterKey = (typeof ACCOUNT_FILTERS)[number]["key"];

/** Columns whose distinct values the facets endpoint offers. */
export const ACCOUNT_FACET_KEYS = ["accountStatus", "existsAlso"] as const;

export type { AccountFilter, FilterValue };
