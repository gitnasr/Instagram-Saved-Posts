import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveProfile, noActiveProfileResponse } from "@/lib/active-profile";
import {
  parseAccountFilters,
  buildAccountWhere,
  buildAccountOrderBy,
  resolveNoteFilterContext,
} from "@/lib/account-filters";

export async function GET(request: Request) {
  const profile = await getActiveProfile();
  if (!profile) return noActiveProfileResponse();

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "24");
  const sort = searchParams.get("sort") ?? "post_count";
  const order = searchParams.get("order") ?? "desc";

  const offset = (page - 1) * limit;

  const filters = parseAccountFilters(searchParams);
  const noteCtx = await resolveNoteFilterContext(filters, profile.id);
  const where = buildAccountWhere(filters, profile.id, noteCtx);
  const orderBy = buildAccountOrderBy(sort, order);

  const [items, total] = await Promise.all([
    prisma.account.findMany({
      where,
      orderBy,
      take: limit,
      skip: offset,
    }),
    prisma.account.count({ where }),
  ]);

  return NextResponse.json({
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
