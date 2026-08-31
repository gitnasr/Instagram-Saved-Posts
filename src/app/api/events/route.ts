import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveProfile, noActiveProfileResponse } from "@/lib/active-profile";
import { EVENT_FILTERS, type EventFilter } from "@/lib/event-filter-defs";
import { parseFilters, buildWhereFragments } from "@/lib/filter-registry";
import type { Prisma } from "@prisma/client";

const MAX_LIMIT = 200;

/**
 * Filtered, paginated account timeline events across every account, with the
 * matching account attached. MongoDB cannot join, so the accounts are fetched
 * in a second query and stitched on — the same shape the per-account timeline
 * already returns.
 */
export async function GET(request: Request) {
  const profile = await getActiveProfile();
  if (!profile) return noActiveProfileResponse();

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1") || 1);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(searchParams.get("limit") ?? "50") || 50)
  );
  const order = searchParams.get("order") === "asc" ? "asc" : "desc";
  const offset = (page - 1) * limit;

  const registry = EVENT_FILTERS as readonly EventFilter[];
  const filters = parseFilters(registry, searchParams);
  const where: Prisma.AccountEventWhereInput = {
    AND: [{ profileId: profile.id }, ...buildWhereFragments(registry, filters)],
  };

  const [items, total] = await Promise.all([
    prisma.accountEvent.findMany({
      where,
      orderBy: { occurredAt: order },
      take: limit,
      skip: offset,
    }),
    prisma.accountEvent.count({ where }),
  ]);

  const accountPks = [...new Set(items.map((e) => e.accountPk))];
  const accounts =
    accountPks.length > 0
      ? await prisma.account.findMany({
          where: { profileId: profile.id, pk: { in: accountPks } },
        })
      : [];
  const accountByPk = new Map(accounts.map((a) => [a.pk, a]));

  return NextResponse.json({
    items: items.map((event) => ({
      ...event,
      account: accountByPk.get(event.accountPk) ?? null,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
