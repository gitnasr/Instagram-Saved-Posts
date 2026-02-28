"use client";

import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { TopAccounts } from "@/components/dashboard/top-accounts";
import { RecentScrapes } from "@/components/dashboard/recent-scrapes";
import { ScrapesTrendChart } from "@/components/dashboard/scrapes-trend-chart";
import { AccountBreakdownCard } from "@/components/dashboard/account-breakdown";
import { useAnalytics } from "@/hooks/use-analytics";

export default function OverviewPage() {
  const { data, isLoading } = useAnalytics();

  return (
    <div className="space-y-6">
      <Header
        title="Overview"
        description="Dashboard overview of your Instagram saved posts"
      />

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
          <Skeleton className="h-64" />
          <Skeleton className="h-40" />
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
