import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [
    totalAccounts,
    totalPosts,
    lastScrape,
    topAccounts,
    recentScrapes,
    mediaTypeGrouped,
    scrapesTrendDesc,
    verified,
    priv,
  ] = await Promise.all([
    prisma.account.count(),
    prisma.post.count(),
    prisma.scrapeRun.findFirst({ orderBy: { startedAt: "desc" } }),
    prisma.account.findMany({
      orderBy: { savedPostCount: "desc" },
      take: 5,
    }),
    prisma.scrapeRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 5,
    }),
    prisma.post.groupBy({
      by: ["mediaType"],
      _count: { _all: true },
    }),
    prisma.scrapeRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 20,
      select: {
        id: true,
        startedAt: true,
        totalPostsFound: true,
        newPostsAdded: true,
        newAccountsFound: true,
        status: true,
      },
    }),
    prisma.account.count({ where: { isVerified: true } }),
    prisma.account.count({ where: { isPrivate: true } }),
  ]);

  const mediaTypeBreakdown = mediaTypeGrouped.map((g) => ({
    mediaType: g.mediaType,
    count: g._count._all,
  }));

  const scrapesTrend = [...scrapesTrendDesc].reverse();

  const accountBreakdown = {
    total: totalAccounts,
    verified,
    private: priv,
    public: totalAccounts - priv,
  };

  return NextResponse.json({
    totalAccounts,
    totalPosts,
    lastScrape: lastScrape ?? null,
    topAccounts,
    recentScrapes,
    mediaTypeBreakdown,
    scrapesTrend,
    accountBreakdown,
  });
}
