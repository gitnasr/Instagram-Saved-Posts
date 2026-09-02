"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { RotateCcw, Ban } from "lucide-react";
import { useResumeScrape, useCancelScrape } from "@/hooks/use-scrape";
import type { ScrapeRun } from "@/types";

interface ScrapeHistoryTableProps {
  runs: ScrapeRun[];
}

const ERROR_KIND_LABEL: Record<string, string> = {
  rate_limited: "rate limited",
  transient: "network error",
  auth: "cookie expired",
  fatal: "unexpected error",
};

export function ScrapeHistoryTable({ runs }: ScrapeHistoryTableProps) {
  const router = useRouter();
  const resumeMutation = useResumeScrape();
  const cancelMutation = useCancelScrape();

  if (runs.length === 0) {
    return (
      <p className="py-12 text-center text-xs font-mono text-ink-muted">
        No sync runs recorded yet. Click &quot;Run Sync&quot; to fetch your saved posts.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[6px] border border-hairline">
      <Table>
        <TableHeader className="bg-surface-2/60">
          <TableRow className="border-hairline hover:bg-transparent">
            <TableHead className="text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Run</TableHead>
            <TableHead className="text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Started</TableHead>
            <TableHead className="text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Status</TableHead>
            <TableHead className="text-right text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Pages</TableHead>
            <TableHead className="text-right text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Found</TableHead>
            <TableHead className="text-right text-[11px] font-mono uppercase tracking-wider text-ink-subtle">New Posts</TableHead>
            <TableHead className="text-right text-[11px] font-mono uppercase tracking-wider text-ink-subtle">New Creators</TableHead>
            <TableHead className="text-right text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Duration</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.map((run) => {
            const started = new Date(run.startedAt);
            const completed = run.completedAt
              ? new Date(run.completedAt)
              : null;
            const duration = completed
              ? Math.round(
                  (completed.getTime() - started.getTime()) / 1000
                )
              : null;
            const isFailed = run.status === "failed";
            const isInterrupted = run.status === "interrupted";
            const isRunning = run.status === "running";
            const canResume =
              !isRunning &&
              run.status !== "completed" &&
              Boolean(run.checkpointMaxId);
            const errorKindLabel = run.errorKind
              ? ERROR_KIND_LABEL[run.errorKind]
              : null;

            return (
              <TableRow
                key={run.id}
                className={cn(
                  "cursor-pointer hover:bg-surface-2 border-hairline transition-colors text-xs font-mono",
                  isFailed && "bg-red-500/5",
                  isInterrupted && "bg-amber-500/5"
                )}
                onClick={() => router.push(`/scrape/${run.id}`)}
              >
                <TableCell className="font-bold text-ink">#{run.id}</TableCell>
                <TableCell>
                  <div>
                    <span className="text-ink">{format(started, "MMM d, yyyy · HH:mm")}</span>
                    {isFailed && run.errorMessage && (
                      <p className="text-[11px] text-red-400 mt-0.5 max-w-56 truncate font-sans">
                        {run.errorMessage}
                      </p>
                    )}
                    {isInterrupted && (
                      <p className="text-[11px] text-ink-muted mt-0.5 font-sans">
                        Stopped at page {run.pagesScraped}
                        {errorKindLabel ? ` — ${errorKindLabel}` : ""}
                      </p>
                    )}
                    {(run.retryCount > 0 || run.resumeCount > 0) && (
                      <p className="text-[10px] text-ink-subtle mt-0.5">
                        {run.retryCount > 0 && `${run.retryCount} retries`}
                        {run.retryCount > 0 && run.resumeCount > 0 && " · "}
                        {run.resumeCount > 0 && `resumed ${run.resumeCount}×`}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {run.status === "completed" ? (
                      <span className="inline-flex items-center rounded-[4px] bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-400">
                        Completed
                      </span>
                    ) : run.status === "running" ? (
                      <span className="inline-flex items-center gap-1 rounded-[4px] bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-400">
                        <span className="size-1 rounded-full bg-amber-400 animate-ping" />
                        Running
                      </span>
                    ) : run.status === "failed" ? (
                      <span className="inline-flex items-center rounded-[4px] bg-red-500/10 border border-red-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-400">
                        Failed
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-[4px] bg-surface-2 border border-hairline px-2 py-0.5 text-[10px] uppercase text-ink-muted">
                        {run.status}
                      </span>
                    )}
                    {canResume && (
                      <Button
                        size="xs"
                        variant="secondary"
                        className="h-6 px-2 text-[10px] font-semibold"
                        onClick={(e) => {
                          e.stopPropagation();
                          resumeMutation.mutate(run.id);
                        }}
                        disabled={resumeMutation.isPending}
                      >
                        <RotateCcw className="size-3 mr-1" />
                        Resume
                      </Button>
                    )}
                    {isRunning && (
                      <Button
                        size="xs"
                        variant="outline"
                        className="h-6 px-2 text-[10px] font-semibold text-red-400 border-red-500/30 hover:bg-red-500/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          cancelMutation.mutate(run.id);
                        }}
                        disabled={cancelMutation.isPending}
                      >
                        <Ban className="size-3 mr-1" />
                        Cancel
                      </Button>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right text-ink-muted">
                  {run.pagesScraped}
                </TableCell>
                <TableCell className="text-right text-ink-muted">
                  {run.totalPostsFound}
                </TableCell>
                <TableCell className="text-right font-bold text-amber-500">
                  +{run.newPostsAdded}
                </TableCell>
                <TableCell className="text-right text-ink-muted">
                  +{run.newAccountsFound}
                </TableCell>
                <TableCell className="text-right text-ink-subtle">
                  {duration !== null ? `${duration}s` : "-"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
