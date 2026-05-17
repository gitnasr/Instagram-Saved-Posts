import { accounts } from "@/db/schema";
import { and, eq, gte, lte, like, or, asc, desc, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

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
  };
}

export function buildAccountWhereClause(
  filters: AccountFilterParams
): SQL | undefined {
  const conditions: SQL[] = [];

  // Search (username + optionally notes)
  if (filters.search) {
    if (filters.searchNotes === "true") {
      const searchCondition = or(
        like(accounts.username, `%${filters.search}%`),
        like(accounts.fullName, `%${filters.search}%`),
        sql`EXISTS (SELECT 1 FROM account_notes WHERE account_notes.account_pk = ${accounts.pk} AND account_notes.content LIKE ${"%" + filters.search + "%"})`
      );
      if (searchCondition) conditions.push(searchCondition);
    } else {
      const searchCondition = or(
        like(accounts.username, `%${filters.search}%`),
        like(accounts.fullName, `%${filters.search}%`)
      );
      if (searchCondition) conditions.push(searchCondition);
    }
  }

  // Verified filter
  if (filters.isVerified === "true") {
    conditions.push(eq(accounts.isVerified, true));
  } else if (filters.isVerified === "false") {
    conditions.push(eq(accounts.isVerified, false));
  }

  // Private filter
  if (filters.isPrivate === "true") {
    conditions.push(eq(accounts.isPrivate, true));
  } else if (filters.isPrivate === "false") {
    conditions.push(eq(accounts.isPrivate, false));
  }

  // Post count range
  if (filters.postCountMin) {
    const min = parseInt(filters.postCountMin);
    if (!isNaN(min)) conditions.push(gte(accounts.savedPostCount, min));
  }
  if (filters.postCountMax) {
    const max = parseInt(filters.postCountMax);
    if (!isNaN(max)) conditions.push(lte(accounts.savedPostCount, max));
  }

  // First seen date range
  if (filters.firstSeenFrom) {
    conditions.push(gte(accounts.firstSeenAt, filters.firstSeenFrom));
  }
  if (filters.firstSeenTo) {
    conditions.push(lte(accounts.firstSeenAt, filters.firstSeenTo + "T23:59:59"));
  }

  // Last seen date range
  if (filters.lastSeenFrom) {
    conditions.push(gte(accounts.lastSeenAt, filters.lastSeenFrom));
  }
  if (filters.lastSeenTo) {
    conditions.push(lte(accounts.lastSeenAt, filters.lastSeenTo + "T23:59:59"));
  }

  // Manual last scrape date range
  if (filters.lastScrapeFrom) {
    conditions.push(gte(accounts.lastScrapeOn, filters.lastScrapeFrom));
  }
  if (filters.lastScrapeTo) {
    conditions.push(lte(accounts.lastScrapeOn, filters.lastScrapeTo));
  }

  // Current account status
  if (filters.accountStatus) {
    conditions.push(like(accounts.accountStatus, `%${filters.accountStatus}%`));
  }

  // Linked account alias
  if (filters.existsAlso) {
    conditions.push(like(accounts.existsAlso, `%${filters.existsAlso}%`));
  }

  // Has notes filter (accounts that have at least one note)
  if (filters.hasNotes === "true") {
    conditions.push(
      sql`EXISTS (SELECT 1 FROM account_notes WHERE account_notes.account_pk = ${accounts.pk})`
    );
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

export function buildAccountOrderClause(sort: string, order: string) {
  const sortColumn =
    sort === "username"
      ? accounts.username
      : sort === "last_seen"
        ? accounts.lastSeenAt
        : sort === "first_seen"
          ? accounts.firstSeenAt
          : sort === "verified"
            ? accounts.isVerified
            : accounts.savedPostCount;

  return order === "asc" ? asc(sortColumn) : desc(sortColumn);
}
