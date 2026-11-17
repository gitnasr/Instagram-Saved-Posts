"use client";

import Link from "next/link";
import { ActivityCard } from "@/components/dashboard/activity-card";
import { RecentScrapes } from "@/components/dashboard/recent-scrapes";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { TopAccounts } from "@/components/dashboard/top-accounts";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalytics } from "@/hooks/use-analytics";
import { Play, Users } from "lucide-react";

export default function OverviewPage() {
  const { data, isLoading } = useAnalytics();

  return (
    <div className="space-y-6">
      <Header
        title="Overview"
        description="Archive totals and the latest sync"
      >
        <Button asChild variant="outline">
          <Link href="/accounts">
            <Users className="size-3.5" />
            Accounts
          </Link>
        </Button>
        <Button asChild>
          <Link href="/scrape">
            <Play className="size-3.5 fill-current" />
            Sync Now
          </Link>
        </Button>
      </Header>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-md" />
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-64 rounded-md" />
            <Skeleton className="h-64 rounded-md" />
          </div>
          <Skeleton className="h-64 rounded-md" />
        </div>
      ) : data ? (
        <>
          <StatsCards
            totalAccounts={data.totalAccounts}
            totalPosts={data.totalPosts}
            lastScrape={data.lastScrape}
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <TopAccounts accounts={data.topAccounts} />
            <RecentScrapes scrapes={data.recentScrapes} />
          </div>
          <ActivityCard trend={data.scrapesTrend} breakdown={data.accountBreakdown} />
        </>
      ) : null}
    </div>
  );
}
