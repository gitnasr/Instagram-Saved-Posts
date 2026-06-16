import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export interface AccountFilterParams {
  search?: string;
  isVerified?: string;
  isPrivate?: string;
  postCountMin?: string;
  postCountMax?: string;
  firstSeenFrom?: string;
  firstSeenTo?: string;
  lastSeenFrom?: string;
  lastSeenTo?: string;
  lastScrapeFrom?: string;
  lastScrapeTo?: string;
  accountStatus?: string;
  existsAlso?: string;
  searchNotes?: string;
  hasNotes?: string;
  lostStatus?: string;
}

export function parseAccountFilters(
  searchParams: URLSearchParams
): AccountFilterParams {
  return {
    search: searchParams.get("search") ?? undefined,
    isVerified: searchParams.get("isVerified") ?? undefined,
    isPrivate: searchParams.get("isPrivate") ?? undefined,
    postCountMin: searchParams.get("postCountMin") ?? undefined,
    postCountMax: searchParams.get("postCountMax") ?? undefined,
    firstSeenFrom: searchParams.get("firstSeenFrom") ?? undefined,
    firstSeenTo: searchParams.get("firstSeenTo") ?? undefined,
    lastSeenFrom: searchParams.get("lastSeenFrom") ?? undefined,
    lastSeenTo: searchParams.get("lastSeenTo") ?? undefined,
    lastScrapeFrom: searchParams.get("lastScrapeFrom") ?? undefined,
    lastScrapeTo: searchParams.get("lastScrapeTo") ?? undefined,
    accountStatus: searchParams.get("accountStatus") ?? undefined,
    existsAlso: searchParams.get("existsAlso") ?? undefined,
    searchNotes: searchParams.get("searchNotes") ?? undefined,
    hasNotes: searchParams.get("hasNotes") ?? undefined,
    lostStatus: searchParams.get("lostStatus") ?? undefined,
  };
}

/**
 * MongoDB has no cross-collection joins, so note-based filters
 * (`searchNotes`, `hasNotes`) are resolved by the caller into pk lists
 * and passed in here.
 */
export interface NoteFilterContext {
  /** pks of accounts whose notes match `search` — only when searchNotes=true */
  notesSearchMatchPks?: string[];
  /** pks of accounts that have at least one note — only when hasNotes=true */
  accountsWithNotesPks?: string[];
}

/**
 * Resolves the cross-collection note filters into account-pk lists,
 * since MongoDB cannot join `accountNotes` to `accounts` in one query.
 */
export async function resolveNoteFilterContext(
  filters: AccountFilterParams,
  profileId: string
): Promise<NoteFilterContext> {
  const ctx: NoteFilterContext = {};

  if (filters.search && filters.searchNotes === "true") {
    const rows = await prisma.accountNote.findMany({
      where: {
        profileId,
        content: { contains: filters.search, mode: "insensitive" },
      },
      select: { accountPk: true },
      distinct: ["accountPk"],
    });
    ctx.notesSearchMatchPks = rows.map((r) => r.accountPk);
  }

  if (filters.hasNotes === "true") {
    const rows = await prisma.accountNote.findMany({
      where: { profileId },
      select: { accountPk: true },
      distinct: ["accountPk"],
    });
    ctx.accountsWithNotesPks = rows.map((r) => r.accountPk);
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

  if (filters.search) {
    const or: Prisma.AccountWhereInput[] = [
      { username: { contains: filters.search, ...insensitive } },
      { fullName: { contains: filters.search, ...insensitive } },
    ];
    if (filters.searchNotes === "true") {
      or.push({ pk: { in: noteCtx.notesSearchMatchPks ?? [] } });
    }
    and.push({ OR: or });
  }

  if (filters.isVerified === "true") {
    and.push({ isVerified: true });
  } else if (filters.isVerified === "false") {
    and.push({ isVerified: false });
  }

  if (filters.isPrivate === "true") {
    and.push({ isPrivate: true });
  } else if (filters.isPrivate === "false") {
    and.push({ isPrivate: false });
  }

  if (filters.postCountMin) {
    const min = parseInt(filters.postCountMin);
    if (!isNaN(min)) and.push({ savedPostCount: { gte: min } });
  }
  if (filters.postCountMax) {
    const max = parseInt(filters.postCountMax);
    if (!isNaN(max)) and.push({ savedPostCount: { lte: max } });
  }

  if (filters.firstSeenFrom) {
    and.push({ firstSeenAt: { gte: filters.firstSeenFrom } });
  }
  if (filters.firstSeenTo) {
    and.push({ firstSeenAt: { lte: filters.firstSeenTo + "T23:59:59" } });
  }

  if (filters.lastSeenFrom) {
    and.push({ lastSeenAt: { gte: filters.lastSeenFrom } });
  }
  if (filters.lastSeenTo) {
    and.push({ lastSeenAt: { lte: filters.lastSeenTo + "T23:59:59" } });
  }

  if (filters.lastScrapeFrom) {
    and.push({ lastScrapeOn: { gte: filters.lastScrapeFrom } });
  }
  if (filters.lastScrapeTo) {
    and.push({ lastScrapeOn: { lte: filters.lastScrapeTo } });
  }

  if (filters.accountStatus) {
    and.push({
      accountStatus: { contains: filters.accountStatus, ...insensitive },
    });
  }

  if (filters.existsAlso) {
    and.push({ existsAlso: { contains: filters.existsAlso, ...insensitive } });
  }

  if (filters.hasNotes === "true") {
    and.push({ pk: { in: noteCtx.accountsWithNotesPks ?? [] } });
  }

  // In MongoDB, fields not yet written to a document are "missing" rather
  // than null, so we explicitly OR in `isSet: false` to catch both states.
  const lostAtNullOrMissing: Prisma.AccountWhereInput = {
    OR: [{ lostAt: null }, { lostAt: { isSet: false } }],
  };
  const recoveredAtNullOrMissing: Prisma.AccountWhereInput = {
    OR: [{ recoveredAt: null }, { recoveredAt: { isSet: false } }],
  };

  if (filters.lostStatus === "lost") {
    and.push({ lostAt: { not: null } });
  } else if (filters.lostStatus === "recovered") {
    and.push(lostAtNullOrMissing);
    and.push({ recoveredAt: { not: null } });
  } else if (filters.lostStatus === "never") {
    and.push(lostAtNullOrMissing);
    and.push(recoveredAtNullOrMissing);
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
    default:
      return { savedPostCount: dir };
  }
}
