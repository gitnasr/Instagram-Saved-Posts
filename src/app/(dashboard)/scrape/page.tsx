"use client";

import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrapeButton } from "@/components/scrape/scrape-button";
import { ScrapeProgressCard } from "@/components/scrape/scrape-progress";
import { ScrapeHistoryTable } from "@/components/scrape/scrape-history-table";
import { useScrapeStatus } from "@/hooks/use-scrape";
import { useCloudinarySyncStatus } from "@/hooks/use-cloudinary-sync";
import { History, ShieldCheck } from "lucide-react";

export default function ScrapePage() {
  const { data, isLoading } = useScrapeStatus();
  const { data: syncData } = useCloudinarySyncStatus();

  const isRunning = data?.current?.status === "running";
  const isScrapeDoneWithSyncRunning =
    data?.current?.status === "completed" &&
    syncData?.current?.status === "running";

  const showProgressCard = isRunning || isScrapeDoneWithSyncRunning;

  return (
    <div className="space-y-6">
      <Header
        title="Sync"
        description="Start a sync of your Instagram saved posts and follow its progress."
      >
        <ScrapeButton isRunning={isRunning} />
      </Header>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-md" />
          <Skeleton className="h-64 w-full rounded-md" />
        </div>
      ) : (
        <>
          {showProgressCard && data?.current && (
            <ScrapeProgressCard progress={data.current} />
          )}

          <Card className="border border-hairline bg-surface-1 shadow-sm">
            <CardHeader className="pb-4 border-b border-hairline flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <History className="size-4 text-highlight" />
                  Sync history
                </CardTitle>
                <CardDescription className="text-xs text-ink-muted mt-0.5">
                  Every sync run, automatic or manual
                </CardDescription>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-mono text-ink-subtle">
                <ShieldCheck className="size-3.5 text-success" />
                <span>Resumable checkpoint enabled</span>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <ScrapeHistoryTable runs={data?.history ?? []} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
