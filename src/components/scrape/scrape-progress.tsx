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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isScrapeDone && isSyncing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              Uploading to Cloudinary...
            </>
          ) : (
            <>
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
              </span>
              Scrape in Progress
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Progress value={undefined} className="h-2" />
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <p className="text-muted-foreground">Pages Scraped</p>
              <p className="text-2xl font-bold">{progress.pagesScraped}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Posts Found</p>
              <p className="text-2xl font-bold">{progress.totalPostsFound}</p>
            </div>
            <div>
              <p className="text-muted-foreground">New Posts</p>
              <p className="text-2xl font-bold">{progress.newPostsAdded}</p>
            </div>
            <div>
              <p className="text-muted-foreground">New Accounts</p>
              <p className="text-2xl font-bold">
                {progress.newAccountsFound}
              </p>
            </div>
          </div>

          {isScrapeDone && isSyncing && syncProgress && (
            <div className="border-t pt-3 text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Cloudinary Upload Progress</p>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                <span>Profiles: {syncProgress.uploadedAccounts}/{syncProgress.totalAccounts}</span>
                <span>Posts: {syncProgress.uploadedPosts}/{syncProgress.totalPosts}</span>
                <span>Carousel: {syncProgress.uploadedCarouselItems}/{syncProgress.totalCarouselItems}</span>
                {syncProgress.failedUploads > 0 && (
                  <span className="text-destructive">{syncProgress.failedUploads} failed</span>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
