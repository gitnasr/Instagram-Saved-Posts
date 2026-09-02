"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ScrapeRun } from "@/types";

interface RecentScrapesProps {
  scrapes: ScrapeRun[];
}

function renderStatusBadge(status: string) {
  switch (status) {
    case "completed":
      return (
        <span className="inline-flex items-center gap-1 rounded-[4px] bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-emerald-400">
          <span className="size-1 rounded-full bg-emerald-400" />
          Completed
        </span>
      );
    case "running":
      return (
        <span className="inline-flex items-center gap-1 rounded-[4px] bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-amber-400">
          <span className="size-1 rounded-full bg-amber-400 animate-ping" />
          Running
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1 rounded-[4px] bg-red-500/10 border border-red-500/20 px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-red-400">
          Failed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-[4px] bg-surface-2 border border-hairline px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-ink-muted">
          {status}
        </span>
      );
  }
}

export function RecentScrapes({ scrapes }: RecentScrapesProps) {
  if (scrapes.length === 0) {
    return null;
  }

  return (
    <Card className="hover:border-hairline-strong transition-all">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold">Recent Sync Runs</CardTitle>
        <Link
          href="/scrape"
          className="text-xs font-semibold text-primary hover:text-amber-400 flex items-center gap-0.5 transition-colors uppercase tracking-wider"
        >
          View all <ChevronRight className="size-3" />
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {scrapes.map((scrape) => (
            <Link
              key={scrape.id}
              href={`/scrape/${scrape.id}`}
              className="flex items-center justify-between rounded-[6px] p-2.5 bg-surface-1/40 hover:bg-surface-2 border border-hairline/40 hover:border-hairline transition-all group"
            >
              <div className="min-w-0 flex-1 pr-3">
                <p className="text-sm font-semibold text-ink group-hover:text-primary transition-colors">
                  {format(new Date(scrape.startedAt), "MMM d, yyyy · HH:mm")}
                </p>
                <p className="text-xs text-ink-muted font-mono mt-0.5 truncate">
                  {scrape.totalPostsFound} total found · +{scrape.newAccountsFound} new accounts
                </p>
              </div>
              <div className="shrink-0">
                {renderStatusBadge(scrape.status)}
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
