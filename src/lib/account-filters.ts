import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import {
  ACCOUNT_FILTERS,
  nullOrMissing,
  type AccountFilterKey,
} from "./account-filter-defs";
import {
  buildWhereFragments,
  parseFilters,
  type FilterValue,
} from "./filter-registry";
import type { AccountEventType } from "@prisma/client";

/**
 * Applied account filters, keyed by descriptor key. Kept as a distinct name
 * from the client-side `AccountFilters` for readability at call sites, but
 * they are the same shape.
 */
export type AccountFilterParams = Partial<
  Record<AccountFilterKey, FilterValue>
> & { search?: string };

/**
 * In MongoDB, fields not yet written to a document are "missing" rather than
 * null, so `ignoredAt`-is-empty checks must cover both states.
 */
export const notIgnoredWhere: Prisma.AccountWhereInput =
  nullOrMissing("ignoredAt");

export function parseAccountFilters(
  searchParams: URLSearchParams
): AccountFilterParams {
  const filters = parseFilters(ACCOUNT_FILTERS, searchParams);
  const search = searchParams.get("search");
  return search ? { ...filters, search } : filters;
}

/**
 * MongoDB has no cross-collection joins, so filters that live in other
 * collections (notes, posts, events) are resolved by the caller into
 * account-pk lists and passed in here.
 */
export interface NoteFilterContext {
  /** pks of accounts whose notes match `search` — only when searchNotes is on */
  notesSearchMatchPks?: string[];
  /** pks of accounts that have at least one note — only when hasNotes is on */
  accountsWithNotesPks?: string[];
  /** pks matching the post-derived filters, when any are set */
  postMatchPks?: string[];
  /** pks matching the event-derived filters, when any are set */
  eventMatchPks?: string[];
}

/** True when the value is a non-empty list. */
function asList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter(Boolean) as string[];
  if (typeof value === "string" && value) return [value];
  return [];
}

function asRange(value: unknown): { from?: string; to?: string } {
  return (value ?? {}) as { from?: string; to?: string };
}

/**
 * Resolves the cross-collection filters into account-pk lists, since MongoDB
 * cannot join `accountNotes`, `posts`, or `accountEvents` to `accounts` in one
 * query.
 *
 * `groupBy` is used rather than `distinct` for the post and event lookups:
 * Prisma's `distinct` post-processes in the client, which would mean loading
 * every matching post into memory, while `groupBy` pushes `$group` down to
 * MongoDB and returns at most one row per account.
 */
export async function resolveNoteFilterContext(
  filters: AccountFilterParams,
  profileId: string
): Promise<NoteFilterContext> {
  const ctx: NoteFilterContext = {};

  if (filters.search && filters.searchNotes === true) {
    const rows = await prisma.accountNote.findMany({
      where: {
        profileId,
        content: { contains: String(filters.search), mode: "insensitive" },
      },
      select: { accountPk: true },
      distinct: ["accountPk"],
    });
    ctx.notesSearchMatchPks = rows.map((r) => r.accountPk);
  }

  if (filters.hasNotes === true) {
    const rows = await prisma.accountNote.findMany({
      where: { profileId },
      select: { accountPk: true },
      distinct: ["accountPk"],
    });
    ctx.accountsWithNotesPks = rows.map((r) => r.accountPk);
  }

  // ── posts ────────────────────────────────────────────────────────────
  const postMediaTypes = asList(filters.postMediaType);
  const postTaken = asRange(filters.postTaken);
  if (postMediaTypes.length > 0 || postTaken.from || postTaken.to) {
    const where: Prisma.PostWhereInput = { profileId };
    if (postMediaTypes.length > 0) {
      where.mediaType = { in: postMediaTypes.map(Number).filter(Number.isFinite) };
    }
    // `takenAt` is a unix timestamp in seconds, not an ISO string.
    if (postTaken.from || postTaken.to) {
      const takenAt: { gte?: number; lte?: number } = {};
      if (postTaken.from) takenAt.gte = Math.floor(Date.parse(`${postTaken.from}T00:00:00Z`) / 1000);
      if (postTaken.to) takenAt.lte = Math.floor(Date.parse(`${postTaken.to}T23:59:59Z`) / 1000);
      where.takenAt = takenAt;
    }
    const rows = await prisma.post.groupBy({
      by: ["accountPk"],
      where,
    });
    ctx.postMatchPks = rows.map((r) => r.accountPk);
  }

  // ── events ───────────────────────────────────────────────────────────
  const eventTypes = asList(filters.eventType);
  const eventRange = asRange(filters.event);
  if (eventTypes.length > 0 || eventRange.from || eventRange.to) {
    const where: Prisma.AccountEventWhereInput = { profileId };
    if (eventTypes.length > 0) {
      where.type = { in: eventTypes as AccountEventType[] };
    }
    if (eventRange.from || eventRange.to) {
      const occurredAt: { gte?: string; lte?: string } = {};
      if (eventRange.from) occurredAt.gte = eventRange.from;
      if (eventRange.to) occurredAt.lte = `${eventRange.to}T23:59:59`;
      where.occurredAt = occurredAt;
    }
    const rows = await prisma.accountEvent.groupBy({
      by: ["accountPk"],
      where,
    });
    ctx.eventMatchPks = rows.map((r) => r.accountPk);
  }

  return ctx;
}

const insensitive = { mode: "insensitive" } as const;

export function buildAccountWhere(
  filters: AccountFilterParams,
  profileId: string,
  noteCtx: NoteFilterContext = {}
): Prisma.AccountWhereInput {
  const and: Prisma.AccountWhereInput[] = [{ profileId }];

  // Free-text search spans username and full name, and optionally notes —
  // it is not a registry entry because it ORs across fields and collections.
  if (filters.search) {
    const term = String(filters.search);
    const or: Prisma.AccountWhereInput[] = [
      { username: { contains: term, ...insensitive } },
      { fullName: { contains: term, ...insensitive } },
    ];
    if (filters.searchNotes === true) {
      or.push({ pk: { in: noteCtx.notesSearchMatchPks ?? [] } });
    }
    and.push({ OR: or });
  }

  and.push(...buildWhereFragments(ACCOUNT_FILTERS, filters));

  // Cross-collection filters resolved upstream into pk lists.
  if (filters.hasNotes === true) {
    and.push({ pk: { in: noteCtx.accountsWithNotesPks ?? [] } });
  }
  if (noteCtx.postMatchPks) {
    and.push({ pk: { in: noteCtx.postMatchPks } });
  }
  if (noteCtx.eventMatchPks) {
    and.push({ pk: { in: noteCtx.eventMatchPks } });
  }

  return and.length > 0 ? { AND: and } : {};
}

export function buildAccountOrderBy(
  sort: string,
  order: string
): Prisma.AccountOrderByWithRelationInput {
  const dir: Prisma.SortOrder = order === "asc" ? "asc" : "desc";

  switch (sort) {
    case "username":
      return { username: dir };
    case "last_seen":
      return { lastSeenAt: dir };
    case "first_seen":
      return { firstSeenAt: dir };
    case "verified":
      return { isVerified: dir };
    case "lost_at":
      return { lostAt: dir };
    default:
      return { savedPostCount: dir };
  }
}
