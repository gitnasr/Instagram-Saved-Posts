"use client";

import Link from "next/link";
import { AccountBreakdownCard } from "@/components/dashboard/account-breakdown";
import { RecentScrapes } from "@/components/dashboard/recent-scrapes";
import { ScrapesTrendChart } from "@/components/dashboard/scrapes-trend-chart";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { TopAccounts } from "@/components/dashboard/top-accounts";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalytics } from "@/hooks/use-analytics";
import { Play, Users, Search } from "lucide-react";

export default function OverviewPage() {
  const { data, isLoading } = useAnalytics();

  return (
    <div className="space-y-6">
      <Header
        title="Overview"
        description="Unified archive metrics and synchronization status"
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/search">
            <Search className="size-3.5" />
            Search
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/accounts">
            <Users className="size-3.5" />
            Accounts
          </Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/scrape">
            <Play className="size-3.5 fill-current" />
            Sync Now
          </Link>
        </Button>
      </Header>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-28 rounded-[8px]" />
            <Skeleton className="h-28 rounded-[8px]" />
            <Skeleton className="h-28 rounded-[8px]" />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-64 rounded-[8px]" />
            <Skeleton className="h-64 rounded-[8px]" />
          </div>
          <Skeleton className="h-64 rounded-[8px]" />
          <Skeleton className="h-40 rounded-[8px]" />
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
          <ScrapesTrendChart data={data.scrapesTrend} />
          <AccountBreakdownCard breakdown={data.accountBreakdown} />
        </>
      ) : null}
    </div>
  );
}

