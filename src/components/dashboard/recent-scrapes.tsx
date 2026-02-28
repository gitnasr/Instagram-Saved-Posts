"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import type { ScrapeRun } from "@/types";

interface RecentScrapesProps {
  scrapes: ScrapeRun[];
}

function statusVariant(status: string) {
  switch (status) {
    case "completed":
      return "default" as const;
    case "running":
      return "secondary" as const;
    case "failed":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

export function RecentScrapes({ scrapes }: RecentScrapesProps) {
  if (scrapes.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Scrapes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {scrapes.map((scrape) => (
            <div
              key={scrape.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div>
                <p className="text-sm font-medium">
                  {format(new Date(scrape.startedAt), "MMM d, yyyy HH:mm")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {scrape.totalPostsFound} posts, {scrape.newAccountsFound} new
                  accounts
                </p>
              </div>
              <Badge variant={statusVariant(scrape.status)}>
                {scrape.status}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
