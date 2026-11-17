"use client";

import { Stat } from "@/components/ui/stat";
import { StatusText } from "@/components/ui/status-text";
import { format } from "date-fns";
import type { ScrapeRun } from "@/types";

interface StatsCardsProps {
  totalAccounts: number;
  totalPosts: number;
  lastScrape: ScrapeRun | null;
}

/** One flat strip of headline figures instead of three separate cards. */
export function StatsCards({ totalAccounts, totalPosts, lastScrape }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 divide-y divide-hairline rounded-lg border border-hairline bg-surface-1 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      <Stat
        className="p-4"
        label="Accounts"
        value={totalAccounts.toLocaleString()}
        hint="Unique creators"
      />
      <Stat
        className="p-4"
        label="Archived posts"
        value={totalPosts.toLocaleString()}
        hint="Stored in your database"
      />
      <Stat
        className="p-4"
        label="Latest sync"
        value={lastScrape ? format(new Date(lastScrape.startedAt), "MMM d, HH:mm") : "Never"}
        hint={
          lastScrape ? (
            <span className="inline-flex items-center gap-1.5">
              +{lastScrape.newPostsAdded} new
              <StatusText tone={lastScrape.status === "completed" ? "success" : "muted"}>
                <span className="capitalize">{lastScrape.status}</span>
              </StatusText>
            </span>
          ) : (
            "No syncs recorded yet"
          )
        }
      />
    </div>
  );
}
