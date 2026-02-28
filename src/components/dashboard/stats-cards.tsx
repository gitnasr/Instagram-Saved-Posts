"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ImageIcon, Clock } from "lucide-react";
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalAccounts}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalPosts}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Last Scrape</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {lastScrape
              ? format(new Date(lastScrape.startedAt), "MMM d, HH:mm")
              : "Never"}
          </div>
          {lastScrape && (
            <p className="text-xs text-muted-foreground">
              {lastScrape.status} - {lastScrape.newPostsAdded} new posts
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
