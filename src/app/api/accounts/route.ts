import { NextResponse } from "next/server";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { sql } from "drizzle-orm";
import {
  parseAccountFilters,
  buildAccountWhereClause,
  buildAccountOrderClause,
} from "@/lib/account-filters";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "24");
  const sort = searchParams.get("sort") ?? "post_count";
  const order = searchParams.get("order") ?? "desc";

  const offset = (page - 1) * limit;

  const filters = parseAccountFilters(searchParams);
  const whereClause = buildAccountWhereClause(filters);
  const orderClause = buildAccountOrderClause(sort, order);

  const items = db
    .select()
    .from(accounts)
    .where(whereClause)
    .orderBy(orderClause)
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
