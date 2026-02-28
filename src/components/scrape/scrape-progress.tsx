"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { ScrapeProgress } from "@/lib/scraper";

interface ScrapeProgressProps {
  progress: ScrapeProgress;
}

export function ScrapeProgressCard({ progress }: ScrapeProgressProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
          </span>
          Scrape in Progress
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
        </div>
      </CardContent>
    </Card>
  );
}
