"use client";

import dynamic from "next/dynamic";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccountBreakdownCard } from "@/components/dashboard/account-breakdown";
import type { AccountBreakdown, ScrapeTrendPoint } from "@/types";

// Recharts is the heaviest dependency on this page; fetch it only when the Trend tab renders.
const ScrapesTrendChart = dynamic(
  () => import("@/components/dashboard/scrapes-trend-chart").then((m) => m.ScrapesTrendChart),
  { ssr: false, loading: () => <Skeleton className="h-[220px] w-full" /> }
);

interface ActivityCardProps {
  trend: ScrapeTrendPoint[];
  breakdown: AccountBreakdown;
}

/** Trend and visibility breakdown share one card; only the active tab is mounted. */
export function ActivityCard({ trend, breakdown }: ActivityCardProps) {
  const hasTrend = trend.length > 0;
  const hasBreakdown = breakdown.total > 0;
  if (!hasTrend && !hasBreakdown) return null;

  return (
    <Card className="gap-3 py-4">
      <CardContent className="px-4">
        <Tabs defaultValue={hasTrend ? "trend" : "visibility"}>
          <TabsList>
            {hasTrend && <TabsTrigger value="trend">Activity</TabsTrigger>}
            {hasBreakdown && <TabsTrigger value="visibility">Visibility</TabsTrigger>}
          </TabsList>
          {hasTrend && (
            <TabsContent value="trend">
              <ScrapesTrendChart data={trend} />
            </TabsContent>
          )}
          {hasBreakdown && (
            <TabsContent value="visibility">
              <AccountBreakdownCard breakdown={breakdown} />
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
