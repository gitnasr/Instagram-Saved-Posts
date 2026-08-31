/**
 * Client-safe account filter shape and its query-string serializer.
 *
 * Lives outside `account-filters.ts` (which imports Prisma's runtime) so client
 * components can use it, and outside `use-accounts.ts` so the CSV export and
 * the account list serialize from one source — they used to drift, and the
 * export silently dropped half the filters.
 *
 * Both halves are now generated from `ACCOUNT_FILTERS`, so there is no longer
 * an exhaustive list here that can fall behind.
 */
import {
  ACCOUNT_FILTERS,
  type AccountFilterKey,
} from "./account-filter-defs";
import { serializeFilters, type FilterValue } from "./filter-registry";

/**
 * A set of applied account filters, keyed by descriptor key. Keys and value
 * shapes are defined by `ACCOUNT_FILTERS`; an absent key means unset.
 */
export type AccountFilters = Partial<Record<AccountFilterKey, FilterValue>>;

export type { FilterValue };

/** Writes every set filter onto `params`. Derived from the registry. */
export function serializeAccountFilters(
  filters: AccountFilters,
  params: URLSearchParams
): URLSearchParams {
  return serializeFilters(ACCOUNT_FILTERS, filters, params);
}
