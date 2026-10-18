import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveProfile, noActiveProfileResponse } from "@/lib/active-profile";
import {
  parseAccountFilters,
  buildAccountWhere,
  resolveNoteFilterContext,
  type AccountFilterParams,
} from "@/lib/account-filters";
import { ACCOUNT_FACET_KEYS } from "@/lib/account-filter-defs";
import { dedupeAndSortTextOptions } from "@/lib/account-metadata";

/**
 * Distinct values with counts for the free-form account columns, so the filter
 * panel can offer real options instead of a blind text box.
 *
 * Each facet is computed with its *own* filter excluded, which is what makes
 * the counts useful: picking "Blocked" should not collapse the status list to
 * a single option, but it should still narrow the counts on every other facet.
 *
 * `groupBy` pushes the aggregation into MongoDB, unlike Prisma's `distinct`,
 * which would pull every matching account into the process first.
 */
export async function GET(request: Request) {
  const profile = await getActiveProfile();
  if (!profile) return noActiveProfileResponse();

  const { searchParams } = new URL(request.url);
  const filters = parseAccountFilters(searchParams);

  const facets: Record<string, { value: string; label: string; count: number }[]> =
    {};

  for (const key of ACCOUNT_FACET_KEYS) {
    // Drop this facet's own selection so its other options stay visible.
    const others: AccountFilterParams = { ...filters };
    delete others[key];

    const noteCtx = await resolveNoteFilterContext(others, profile.id);
    const where = buildAccountWhere(others, profile.id, noteCtx);

    const grouped = await prisma.account.groupBy({
      by: [key],
      where,
      _count: { _all: true },
    });

    const counts = new Map<string, number>();
    for (const row of grouped) {
      const raw = (row as Record<string, unknown>)[key];
      if (typeof raw !== "string" || raw.trim() === "") continue;
      counts.set(raw, (counts.get(raw) ?? 0) + row._count._all);
    }

    // Normalize casing/whitespace the same way the account editor does, so
    // "blocked" and "Blocked" collapse into one option.
    facets[key] = dedupeAndSortTextOptions([...counts.keys()]).map((value) => ({
      value,
      label: value,
      count: counts.get(value) ?? 0,
    }));
  }

  return NextResponse.json({ facets });
}
