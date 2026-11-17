"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookmarkCheck, Clock } from "lucide-react";
import { format } from "date-fns";
import type { ScrapeRun } from "@/types";

interface StatsCardsProps {
  totalAccounts: number;
  totalPosts: number;
  lastScrape: ScrapeRun | null;
}

export function StatsCards({
  totalAccounts,
  totalPosts,
  lastScrape,
}: StatsCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* Total Accounts */}
      <Card className="relative overflow-hidden group hover:border-hairline-strong transition-all">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-eyebrow text-ink-subtle">
            Total Accounts
          </CardTitle>
          <div className="text-amber-500">
            <Users className="size-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold tracking-tight text-ink">
            {totalAccounts.toLocaleString()}
          </div>
          <p className="text-xs text-ink-muted mt-1 flex items-center gap-1 font-mono">
            Unique Instagram creators
          </p>
        </CardContent>
      </Card>

      {/* Total Saved Posts */}
      <Card className="relative overflow-hidden group hover:border-hairline-strong transition-all">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-eyebrow text-ink-subtle">
            Archived Posts
          </CardTitle>
          <div className="text-amber-500">
            <BookmarkCheck className="size-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold tracking-tight text-ink">
            {totalPosts.toLocaleString()}
          </div>
          <p className="text-xs text-ink-muted mt-1 flex items-center gap-1 font-mono">
            Permanently preserved
          </p>
        </CardContent>
      </Card>

      {/* Last Scrape */}
      <Card className="relative overflow-hidden group hover:border-hairline-strong transition-all sm:col-span-2 lg:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-eyebrow text-ink-subtle">
            Latest Sync
          </CardTitle>
          <div className="text-amber-500">
            <Clock className="size-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold tracking-tight text-ink">
            {lastScrape
              ? format(new Date(lastScrape.startedAt), "MMM d, HH:mm")
              : "Never"}
          </div>
          {lastScrape ? (
            <div className="flex items-center gap-1.5 mt-1 text-xs text-ink-muted font-mono">
              <span className="inline-block size-1.5 rounded-full bg-emerald-500" />
              <span>+{lastScrape.newPostsAdded} new posts</span>
              <span className="text-ink-subtle">·</span>
              <span className="capitalize">{lastScrape.status}</span>
            </div>
          ) : (
            <p className="text-xs text-ink-muted mt-1">No scrapes recorded yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
