import { NextResponse } from "next/server";
import { db } from "@/db";
import { accounts, posts } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "24");
  const offset = (page - 1) * limit;

  const account = db
    .select()
    .from(accounts)
    .where(eq(accounts.username, username))
    .get();

  if (!account) {
    return NextResponse.json(
      { error: "Account not found" },
      { status: 404 }
    );
  }

  const accountPosts = db
    .select()
    .from(posts)
    .where(eq(posts.accountPk, account.pk))
    .orderBy(desc(posts.takenAt))
    .limit(limit)
    .offset(offset)
    .all();

  const totalResult = db
    .select({ count: sql<number>`COUNT(*)` })
    .from(posts)
    .where(eq(posts.accountPk, account.pk))
    .get();

  const total = totalResult?.count ?? 0;

  return NextResponse.json({
    account,
    posts: accountPosts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
