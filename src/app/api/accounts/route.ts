import { NextResponse } from "next/server";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { desc, asc, like, sql } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "24");
  const search = searchParams.get("search") ?? "";
  const sort = searchParams.get("sort") ?? "post_count";
  const order = searchParams.get("order") ?? "desc";

  const offset = (page - 1) * limit;

  const sortColumn =
    sort === "username"
      ? accounts.username
      : sort === "last_seen"
        ? accounts.lastSeenAt
        : accounts.savedPostCount;

  const sortDir = order === "asc" ? asc(sortColumn) : desc(sortColumn);

  const whereClause = search
    ? like(accounts.username, `%${search}%`)
    : undefined;

  const items = db
    .select()
    .from(accounts)
    .where(whereClause)
    .orderBy(sortDir)
    .limit(limit)
    .offset(offset)
    .all();

  const totalResult = db
    .select({ count: sql<number>`COUNT(*)` })
    .from(accounts)
    .where(whereClause)
    .get();

  return NextResponse.json({
    items,
    pagination: {
      page,
      limit,
      total: totalResult?.count ?? 0,
      totalPages: Math.ceil((totalResult?.count ?? 0) / limit),
    },
  });
}
