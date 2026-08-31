import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveProfile, noActiveProfileResponse } from "@/lib/active-profile";
import { POST_FILTERS, buildPostOrderBy } from "@/lib/post-filter-defs";
import { parseFilters, buildWhereFragments } from "@/lib/filter-registry";
import type { Prisma } from "@prisma/client";
import type { PostFilter } from "@/lib/post-filter-defs";

const MAX_LIMIT = 100;

/**
 * Filtered, paginated saved posts. Mirrors the accounts list route so both
 * surfaces page and sort the same way.
 */
export async function GET(request: Request) {
  const profile = await getActiveProfile();
  if (!profile) return noActiveProfileResponse();

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1") || 1);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(searchParams.get("limit") ?? "24") || 24)
  );
  const sort = searchParams.get("sort") ?? "taken_at";
  const order = searchParams.get("order") ?? "desc";
  const offset = (page - 1) * limit;

  const filters = parseFilters(POST_FILTERS as readonly PostFilter[], searchParams);
  const where: Prisma.PostWhereInput = {
    AND: [
      { profileId: profile.id },
      ...buildWhereFragments(POST_FILTERS as readonly PostFilter[], filters),
    ],
  };

  const [items, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: buildPostOrderBy(sort, order),
      take: limit,
      skip: offset,
    }),
    prisma.post.count({ where }),
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
