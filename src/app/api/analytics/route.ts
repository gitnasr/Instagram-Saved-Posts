import { NextResponse } from "next/server";
import { db } from "@/db";
import { accounts, posts, scrapeRuns } from "@/db/schema";
import { sql, desc, eq } from "drizzle-orm";

export async function GET() {
  const totalAccounts = db
    .select({ count: sql<number>`COUNT(*)` })
    .from(accounts)
    .get();

  const totalPosts = db
    .select({ count: sql<number>`COUNT(*)` })
    .from(posts)
    .get();

  const lastScrape = db
    .select()
    .from(scrapeRuns)
    .orderBy(desc(scrapeRuns.startedAt))
    .limit(1)
    .get();

  const topAccounts = db
    .select()
    .from(accounts)
    .orderBy(desc(accounts.savedPostCount))
    .limit(5)
    .all();

  const recentScrapes = db
    .select()
    .from(scrapeRuns)
    .orderBy(desc(scrapeRuns.startedAt))
    .limit(5)
    .all();

  const mediaTypeBreakdown = db
    .select({
      mediaType: posts.mediaType,
      count: sql<number>`COUNT(*)`,
    })
    .from(posts)
    .groupBy(posts.mediaType)
    .all();

  // Scrapes trend — last 20 runs in chronological order
  const scrapesTrendDesc = db
    .select({
      id: scrapeRuns.id,
      startedAt: scrapeRuns.startedAt,
      totalPostsFound: scrapeRuns.totalPostsFound,
      newPostsAdded: scrapeRuns.newPostsAdded,
      newAccountsFound: scrapeRuns.newAccountsFound,
      status: scrapeRuns.status,
    })
    .from(scrapeRuns)
    .orderBy(desc(scrapeRuns.startedAt))
    .limit(20)
    .all();
  const scrapesTrend = [...scrapesTrendDesc].reverse();

  // Account breakdown
  const total = totalAccounts?.count ?? 0;
  const verifiedCount = db
    .select({ count: sql<number>`COUNT(*)` })
    .from(accounts)
    .where(eq(accounts.isVerified, true))
    .get();
  const privateCount = db
    .select({ count: sql<number>`COUNT(*)` })
    .from(accounts)
    .where(eq(accounts.isPrivate, true))
    .get();
  const verified = verifiedCount?.count ?? 0;
  const priv = privateCount?.count ?? 0;

  const accountBreakdown = {
    total,
    verified,
    private: priv,
    public: total - priv,
  };

  return NextResponse.json({
    totalAccounts: total,
    totalPosts: totalPosts?.count ?? 0,
    lastScrape: lastScrape ?? null,
    topAccounts,
    recentScrapes,
    mediaTypeBreakdown,
    scrapesTrend,
    accountBreakdown,
  });
}
