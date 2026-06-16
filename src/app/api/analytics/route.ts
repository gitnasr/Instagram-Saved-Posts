import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveProfile, noActiveProfileResponse } from "@/lib/active-profile";

export async function GET() {
  const profile = await getActiveProfile();
  if (!profile) return noActiveProfileResponse();
  const profileId = profile.id;

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
    prisma.account.count({ where: { profileId } }),
    prisma.post.count({ where: { profileId } }),
    prisma.scrapeRun.findFirst({
      where: { profileId },
      orderBy: { startedAt: "desc" },
    }),
    prisma.account.findMany({
      where: { profileId },
      orderBy: { savedPostCount: "desc" },
      take: 5,
    }),
    prisma.scrapeRun.findMany({
      where: { profileId },
      orderBy: { startedAt: "desc" },
      take: 5,
    }),
    prisma.post.groupBy({
      by: ["mediaType"],
      where: { profileId },
      _count: { _all: true },
    }),
    prisma.scrapeRun.findMany({
      where: { profileId },
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
    prisma.account.count({ where: { profileId, isVerified: true } }),
    prisma.account.count({ where: { profileId, isPrivate: true } }),
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
