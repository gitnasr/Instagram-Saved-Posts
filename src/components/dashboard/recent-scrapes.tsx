"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusText } from "@/components/ui/status-text";
import { format } from "date-fns";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ScrapeRun } from "@/types";

interface RecentScrapesProps {
  scrapes: ScrapeRun[];
}

const STATUS_TONE = {
  completed: "success",
  running: "warn",
  failed: "danger",
} as const;

function renderStatus(status: string) {
  const tone = STATUS_TONE[status as keyof typeof STATUS_TONE] ?? "muted";
  return (
    <StatusText tone={tone} live={status === "running"}>
      <span className="capitalize">{status}</span>
    </StatusText>
  );
}

export function RecentScrapes({ scrapes }: RecentScrapesProps) {
  if (scrapes.length === 0) {
    return null;
  }

  return (
    <Card className="gap-2 py-4">
      <CardHeader className="flex flex-row items-center justify-between px-4">
        <CardTitle className="text-sm font-medium">Recent syncs</CardTitle>
        <Link
          href="/scrape"
          className="flex items-center gap-0.5 text-xs text-ink-muted transition-colors hover:text-foreground"
        >
          View all <ChevronRight className="size-3" />
        </Link>
      </CardHeader>
      <CardContent className="px-2">
        <div className="divide-y divide-hairline/60">
          {scrapes.map((scrape) => (
            <Link
              key={scrape.id}
              href={`/scrape/${scrape.id}`}
              className="flex items-center justify-between gap-3 rounded-sm px-2 py-2 transition-colors hover:bg-surface-2"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">
                  {format(new Date(scrape.startedAt), "MMM d, yyyy · HH:mm")}
                </p>
                <p className="mt-0.5 truncate text-xs text-ink-muted">
                  {scrape.totalPostsFound} found · +{scrape.newAccountsFound} new accounts
                </p>
              </div>
              <div className="shrink-0">{renderStatus(scrape.status)}</div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
