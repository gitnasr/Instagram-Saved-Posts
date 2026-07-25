/**
 * Client-safe account filter shape and its query-string serializer.
 *
 * Lives outside `account-filters.ts` (which imports Prisma) so client
 * components can use it, and outside `use-accounts.ts` so the CSV export and
 * the account list serialize from one source — they used to drift, and the
 * export silently dropped half the filters.
 */
export interface AccountFilters {
  isVerified?: "true" | "false";
  isPrivate?: "true" | "false";
  postCountMin?: number;
  postCountMax?: number;
  firstSeenFrom?: string;
  firstSeenTo?: string;
  lastSeenFrom?: string;
  lastSeenTo?: string;
  lastScrapeFrom?: string;
  lastScrapeTo?: string;
  accountStatus?: string;
  existsAlso?: string;
  searchNotes?: boolean;
  hasNotes?: boolean;
  lostStatus?: "lost" | "recovered" | "never";
  ignoredStatus?: "ignored" | "active";
}

/** Writes every set filter onto `params`. Must stay exhaustive. */
export function serializeAccountFilters(
  filters: AccountFilters,
  params: URLSearchParams
): URLSearchParams {
  if (filters.isVerified) params.set("isVerified", filters.isVerified);
  if (filters.isPrivate) params.set("isPrivate", filters.isPrivate);
  if (filters.postCountMin != null)
    params.set("postCountMin", String(filters.postCountMin));
  if (filters.postCountMax != null)
    params.set("postCountMax", String(filters.postCountMax));
  if (filters.firstSeenFrom) params.set("firstSeenFrom", filters.firstSeenFrom);
  if (filters.firstSeenTo) params.set("firstSeenTo", filters.firstSeenTo);
  if (filters.lastSeenFrom) params.set("lastSeenFrom", filters.lastSeenFrom);
  if (filters.lastSeenTo) params.set("lastSeenTo", filters.lastSeenTo);
  if (filters.lastScrapeFrom)
    params.set("lastScrapeFrom", filters.lastScrapeFrom);
  if (filters.lastScrapeTo) params.set("lastScrapeTo", filters.lastScrapeTo);
  if (filters.accountStatus) params.set("accountStatus", filters.accountStatus);
  if (filters.existsAlso) params.set("existsAlso", filters.existsAlso);
  if (filters.searchNotes) params.set("searchNotes", "true");
  if (filters.hasNotes) params.set("hasNotes", "true");
  if (filters.lostStatus) params.set("lostStatus", filters.lostStatus);
  if (filters.ignoredStatus) params.set("ignoredStatus", filters.ignoredStatus);
  return params;
}
