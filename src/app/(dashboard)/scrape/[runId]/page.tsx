"use client";

import { useState, use } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { RunDetailStats } from "@/components/scrape/run-detail-stats";
import { AccountsGrid } from "@/components/accounts/accounts-grid";
import { PostCard } from "@/components/posts/post-card";
import { PostDetailDialog } from "@/components/posts/post-detail-dialog";
import { useRunDetail } from "@/hooks/use-run-detail";
import { useResumeScrape } from "@/hooks/use-scrape";
import { format, formatDistanceStrict } from "date-fns";
import { AlertCircle, ChevronRight, RotateCcw } from "lucide-react";
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
  const resumeMutation = useResumeScrape();
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

  const {
    run,
    newPosts,
    newAccounts,
    lostAccounts,
    newlyLostAccounts,
    newlyRecoveredAccounts,
    usernameChanges,
  } = data;
    const canResume =
    run.status !== "running" &&
    run.status !== "completed" &&
    Boolean(run.checkpointMaxId);
  const resumeButton = (
    <Button
      size="sm"
      variant="secondary"
      onClick={() => resumeMutation.mutate(run.id)}
      disabled={resumeMutation.isPending}
    >
      <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
      Resume Scrape
    </Button>
  );
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

      {/* Interrupted alert */}
      {run.status === "interrupted" && (
        <Alert>
          <RotateCcw className="h-4 w-4" />
          <AlertTitle>Scrape Interrupted</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>
              {run.errorKind === "rate_limited"
                ? "Instagram rate-limited this scrape"
                : run.errorKind === "transient"
                  ? "A network error stopped this scrape"
                  : "The server restarted while this scrape was running"}
              . It stopped at page {run.pagesScraped}
              {run.retryCount > 0 && ` after ${run.retryCount} retries`}.
              Resume to continue from where it left off.
            </span>
            {canResume && resumeButton}
          </AlertDescription>
        </Alert>
      )}

      {/* Cancelled alert */}
      {run.status === "cancelled" && (
        <Alert>
          <RotateCcw className="h-4 w-4" />
          <AlertTitle>Scrape Cancelled</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>
              This scrape was cancelled at page {run.pagesScraped}. Its
              checkpoint was kept, so it can still be resumed.
            </span>
            {canResume && resumeButton}
          </AlertDescription>
        </Alert>
      )}

      {/* Error alert */}
      {run.status === "failed" && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Scrape Failed</AlertTitle>
          <AlertDescription className="font-mono text-xs break-all">
            {run.errorMessage ?? "No error message was recorded."}
          </AlertDescription>
          {run.errorKind === "auth" && (
            <p className="mt-2 text-xs">
              This looks like an expired or invalid session cookie. Update it in
              Settings, then start a new scrape.
            </p>
          )}
          {canResume && (
            <div className="mt-3 flex items-center gap-3">
              {resumeButton}
              <span className="text-xs opacity-80">
                Stopped at page {run.pagesScraped} — the checkpoint is still
                valid.
              </span>
            </div>
          )}
          {run.errorBody && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs opacity-70 hover:opacity-100">
                Instagram API response ▾
              </summary>
              <pre className="mt-2 max-h-72 overflow-auto rounded bg-black/10 p-3 text-xs whitespace-pre-wrap break-all">
                {run.errorBody}
              </pre>
            </details>
          )}
        </Alert>
      )}

      {/* Stats grid */}
      <RunDetailStats
        pagesScraped={run.pagesScraped}
        totalPostsFound={run.totalPostsFound}
        newPostsAdded={run.newPostsAdded}
        newAccountsFound={run.newAccountsFound}
        lostAccountsCount={run.lostAccountsCount ?? 0}
        newlyLostAccountsCount={run.newlyLostAccountsCount ?? newlyLostAccounts.length}
        newlyRecoveredAccountsCount={run.newlyRecoveredAccountsCount ?? newlyRecoveredAccounts.length}
        usernameChangesCount={run.usernameChangesCount ?? usernameChanges.length}
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

      {/* Username Changes */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-ink">Username Handle Shifts</h3>
          <Badge variant={usernameChanges.length > 0 ? "default" : "secondary"} className="font-mono text-[10px]">
            {usernameChanges.length}
          </Badge>
        </div>
        {usernameChanges.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {usernameChanges.map((change) => (
              <Link
                key={change.id}
                href={`/accounts/${change.account.username}`}
                className="rounded-[8px] border border-hairline bg-surface-1 p-4 transition-all hover:border-hairline-strong hover:bg-surface-2 group"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-sm text-ink group-hover:text-primary transition-colors">@{change.account.username}</span>
                  <Badge variant="outline" className="font-mono text-[9px] text-ink-subtle">pk {change.accountPk}</Badge>
                </div>
                <div className="mt-2.5 text-xs font-mono">
                  <span className="text-ink-muted">was </span>
                  <span className="text-red-400">@{change.oldUsername}</span>
                  <span className="text-ink-muted"> &rarr; </span>
                  <span className="text-emerald-400 font-semibold">@{change.newUsername}</span>
                </div>
                <p className="mt-2 text-[10px] font-mono text-ink-subtle">
                  Detected {format(new Date(change.changedAt), "MMM d, yyyy · HH:mm")}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-xs font-mono text-ink-muted py-2">
            No username changes detected in this sync run.
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

      {/* Lost / Recovered sections — only for completed runs */}
      {run.status === "completed" && (
        <>
          <Separator />
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">Newly Lost Accounts</h3>
              <Badge variant={newlyLostAccounts.length > 0 ? "destructive" : "secondary"}>
                {newlyLostAccounts.length}
              </Badge>
            </div>
            {newlyLostAccounts.length > 0 ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Accounts that were present in previous scrapes but went missing in this run.
                </p>
                <AccountsGrid accounts={newlyLostAccounts} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-4">
                No accounts went missing in this run.
              </p>
            )}
          </div>

          <Separator />
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">Newly Recovered Accounts</h3>
              <Badge variant={newlyRecoveredAccounts.length > 0 ? "default" : "secondary"}>
                {newlyRecoveredAccounts.length}
              </Badge>
            </div>
            {newlyRecoveredAccounts.length > 0 ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Previously-lost accounts that reappeared in the saved feed during this run.
                </p>
                <AccountsGrid accounts={newlyRecoveredAccounts} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-4">
                No previously-lost accounts reappeared in this run.
              </p>
            )}
          </div>

          <Separator />
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">All Lost Accounts</h3>
              <Badge variant={lostAccounts.length > 0 ? "destructive" : "secondary"}>
                {lostAccounts.length}
              </Badge>
            </div>
            {lostAccounts.length > 0 ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Cumulative list of every account currently missing from the saved feed.
                  Their data remains in your database.
                </p>
                <AccountsGrid accounts={lostAccounts} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-4">
                No accounts are currently lost. All previously seen accounts appeared in the feed.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
