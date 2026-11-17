"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { useCloudinarySyncStatus } from "@/hooks/use-cloudinary-sync";
import type { ScrapeProgress } from "@/lib/scraper";

interface ScrapeProgressProps {
  progress: ScrapeProgress;
}

export function ScrapeProgressCard({ progress }: ScrapeProgressProps) {
  const { data: syncData } = useCloudinarySyncStatus();
  const syncProgress = syncData?.current;
  const isSyncing = syncProgress?.status === "running";
  const isScrapeDone = progress.status === "completed";

  return (
    <Card className="border-primary/40 bg-surface-1">
      <CardHeader className="pb-3 border-b border-hairline">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-ink">
          {isScrapeDone && isSyncing ? (
            <>
              <Loader2 className="size-4 animate-spin text-highlight" />
              <span>Uploading Media to Cloudinary...</span>
            </>
          ) : (
            <>
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
              </span>
              <span>Sync in Progress</span>
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <Progress value={undefined} className="h-1.5 bg-surface-2 [&>div]:bg-primary" />
        <div className="grid grid-cols-2 gap-4 text-xs font-mono sm:grid-cols-4">
          <div className="p-2 rounded-md bg-surface-2 border border-hairline">
            <p className="text-ink-subtle text-xs">Pages scraped</p>
            <p className="text-xl font-medium text-ink mt-0.5">{progress.pagesScraped}</p>
          </div>
          <div className="p-2 rounded-md bg-surface-2 border border-hairline">
            <p className="text-ink-subtle text-xs">Posts found</p>
            <p className="text-xl font-medium text-ink mt-0.5">{progress.totalPostsFound}</p>
          </div>
          <div className="p-2 rounded-md bg-surface-2 border border-hairline">
            <p className="text-ink-subtle text-xs">New posts</p>
            <p className="text-xl font-medium text-highlight mt-0.5">+{progress.newPostsAdded}</p>
          </div>
          <div className="p-2 rounded-md bg-surface-2 border border-hairline">
            <p className="text-ink-subtle text-xs">New creators</p>
            <p className="text-xl font-medium text-ink mt-0.5">+{progress.newAccountsFound}</p>
          </div>
        </div>

        {isScrapeDone && isSyncing && syncProgress && (
          <div className="border-t border-hairline pt-3 text-xs text-ink-muted space-y-1 font-mono">
            <p className="font-medium text-foreground text-xs">Cloudinary Upload Status</p>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
              <span>Profiles: {syncProgress.uploadedAccounts}/{syncProgress.totalAccounts}</span>
              <span>Posts: {syncProgress.uploadedPosts}/{syncProgress.totalPosts}</span>
              <span>Carousel: {syncProgress.uploadedCarouselItems}/{syncProgress.totalCarouselItems}</span>
              {syncProgress.failedUploads > 0 && (
                <span className="text-danger">{syncProgress.failedUploads} failed</span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
