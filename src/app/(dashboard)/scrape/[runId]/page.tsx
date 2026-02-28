"use client";

import { useState, use } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { RunDetailStats } from "@/components/scrape/run-detail-stats";
import { AccountsGrid } from "@/components/accounts/accounts-grid";
import { PostCard } from "@/components/posts/post-card";
import { PostDetailDialog } from "@/components/posts/post-detail-dialog";
import { useRunDetail } from "@/hooks/use-run-detail";
import { format, formatDistanceStrict } from "date-fns";
import { AlertCircle, ChevronRight } from "lucide-react";
import type { Post } from "@/types";

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

export default function RunDetailPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = use(params);
  const runIdNum = parseInt(runId);
  const { data, isLoading } = useRunDetail(runIdNum);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Scrape run not found.
      </div>
    );
  }

  const { run, newPosts, newAccounts } = data;
  const started = new Date(run.startedAt);
  const completed = run.completedAt ? new Date(run.completedAt) : null;
  const duration = completed
    ? formatDistanceStrict(completed, started)
    : null;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/scrape" className="hover:text-foreground">
          Scrape
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">Run #{run.id}</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">Run #{run.id}</h2>
            <Badge variant={statusVariant(run.status)} className="text-sm">
              {run.status}
            </Badge>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>Started {format(started, "MMM d, yyyy 'at' HH:mm")}</span>
            {completed && (
              <span>
                Finished {format(completed, "MMM d, yyyy 'at' HH:mm")}
              </span>
            )}
            {duration && <span>Duration: {duration}</span>}
          </div>
        </div>
      </div>

      {/* Error alert */}
      {run.status === "failed" && run.errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Scrape Failed</AlertTitle>
          <AlertDescription className="font-mono text-xs break-all">
            {run.errorMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats grid */}
      <RunDetailStats
        pagesScraped={run.pagesScraped}
        totalPostsFound={run.totalPostsFound}
        newPostsAdded={run.newPostsAdded}
        newAccountsFound={run.newAccountsFound}
      />

      <Separator />

      {/* New Accounts */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">New Accounts Discovered</h3>
          <Badge variant="secondary">{newAccounts.length}</Badge>
        </div>
        {newAccounts.length > 0 ? (
          <AccountsGrid accounts={newAccounts} />
        ) : (
          <p className="text-sm text-muted-foreground py-4">
            No new accounts were discovered in this run.
          </p>
        )}
      </div>

      <Separator />

      {/* New Posts */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">New Posts Added</h3>
          <Badge variant="secondary">{newPosts.length}</Badge>
        </div>
        {newPosts.length > 0 ? (
          <>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {newPosts.map((post) => (
                <PostCard
                  key={post.pk}
                  post={post}
                  onClick={() => setSelectedPost(post)}
                />
              ))}
            </div>
            <PostDetailDialog
              post={selectedPost}
              open={!!selectedPost}
              onOpenChange={(open) => {
                if (!open) setSelectedPost(null);
              }}
            />
          </>
        ) : (
          <p className="text-sm text-muted-foreground py-4">
            No new posts were added in this run.
          </p>
        )}
      </div>
    </div>
  );
}
