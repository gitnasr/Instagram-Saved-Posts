"use client";

import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrapeButton } from "@/components/scrape/scrape-button";
import { ScrapeProgressCard } from "@/components/scrape/scrape-progress";
import { ScrapeHistoryTable } from "@/components/scrape/scrape-history-table";
import { useScrapeStatus } from "@/hooks/use-scrape";

export default function ScrapePage() {
  const { data, isLoading } = useScrapeStatus();

  const isRunning = data?.current?.status === "running";

  return (
    <div className="space-y-6">
      <Header
        title="Scrape Management"
        description="Run the scraper and view scrape history"
      >
        <ScrapeButton isRunning={isRunning} />
      </Header>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
          {isRunning && data?.current && (
            <ScrapeProgressCard progress={data.current} />
          )}

          <Card>
            <CardHeader>
              <CardTitle>Scrape History</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrapeHistoryTable runs={data?.history ?? []} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
