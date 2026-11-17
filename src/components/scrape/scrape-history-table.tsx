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
import { StatusText } from "@/components/ui/status-text";
import { format } from "date-fns";
import Link from "next/link";
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

const STATUS_TONE = {
  completed: "success",
  running: "warn",
  failed: "danger",
  interrupted: "warn",
} as const;

export function ScrapeHistoryTable({ runs }: ScrapeHistoryTableProps) {
  const router = useRouter();
  const resumeMutation = useResumeScrape();
  const cancelMutation = useCancelScrape();

  if (runs.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-ink-muted">
        No sync runs recorded yet. Click &quot;Run Sync&quot; to fetch your saved posts.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-hairline">
      <Table
        containerProps={{
          role: "region",
          "aria-label": "Sync run history",
          tabIndex: 0,
          className: "focus-visible:outline-2 focus-visible:outline-primary/50",
        }}
      >
        <TableHeader>
          <TableRow className="border-hairline hover:bg-transparent">
            <TableHead className="text-eyebrow text-ink-subtle">Run</TableHead>
            <TableHead className="text-eyebrow text-ink-subtle">Started</TableHead>
            <TableHead className="text-eyebrow text-ink-subtle">Status</TableHead>
            <TableHead className="text-eyebrow text-right text-ink-subtle">Added</TableHead>
            <TableHead className="text-eyebrow text-right text-ink-subtle">Duration</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.map((run) => {
            const started = new Date(run.startedAt);
            const completed = run.completedAt ? new Date(run.completedAt) : null;
            const duration = completed
              ? Math.round((completed.getTime() - started.getTime()) / 1000)
              : null;
            const isFailed = run.status === "failed";
            const isInterrupted = run.status === "interrupted";
            const isRunning = run.status === "running";
            const canResume =
              !isRunning && run.status !== "completed" && Boolean(run.checkpointMaxId);
            const errorKindLabel = run.errorKind ? ERROR_KIND_LABEL[run.errorKind] : null;
            const tone = STATUS_TONE[run.status as keyof typeof STATUS_TONE] ?? "muted";

            return (
              <TableRow
                key={run.id}
                className={cn(
                  "cursor-pointer border-hairline text-sm hover:bg-surface-2",
                  isFailed && "bg-red-500/5",
                  isInterrupted && "bg-amber-500/5"
                )}
                onClick={() => router.push(`/scrape/${run.id}`)}
              >
                <TableCell className="font-mono font-semibold text-ink">
                  {/* Real link so keyboard/AT users can open a run; row click stays as a mouse shortcut */}
                  <Link
                    href={`/scrape/${run.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="hover:underline focus-visible:underline"
                  >
                    #{run.id}
                  </Link>
                </TableCell>
                <TableCell>
                  <span className="text-ink">{format(started, "MMM d, yyyy · HH:mm")}</span>
                  {isFailed && run.errorMessage && (
                    <p className="mt-0.5 max-w-56 truncate text-xs text-red-400">
                      {run.errorMessage}
                    </p>
                  )}
                  {isInterrupted && (
                    <p className="mt-0.5 text-xs text-ink-muted">
                      Stopped at page {run.pagesScraped}
                      {errorKindLabel ? ` · ${errorKindLabel}` : ""}
                    </p>
                  )}
                  {(run.retryCount > 0 || run.resumeCount > 0) && (
                    <p className="mt-0.5 text-xs text-ink-subtle">
                      {run.retryCount > 0 && `${run.retryCount} retries`}
                      {run.retryCount > 0 && run.resumeCount > 0 && " · "}
                      {run.resumeCount > 0 && `resumed ${run.resumeCount}×`}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <StatusText tone={tone} live={isRunning}>
                      <span className="capitalize">{run.status}</span>
                    </StatusText>
                    {canResume && (
                      <Button
                        variant="secondary"
                        className="px-2 text-xs font-semibold"
                        onClick={(e) => {
                          e.stopPropagation();
                          resumeMutation.mutate(run.id);
                        }}
                        disabled={resumeMutation.isPending}
                      >
                        <RotateCcw className="mr-1 size-3" />
                        Resume
                      </Button>
                    )}
                    {isRunning && (
                      <Button
                        variant="outline"
                        className="border-red-500/30 px-2 text-xs font-semibold text-red-400 hover:bg-red-500/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          cancelMutation.mutate(run.id);
                        }}
                        disabled={cancelMutation.isPending}
                      >
                        <Ban className="mr-1 size-3" />
                        Cancel
                      </Button>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right text-ink-muted">
                  <span className="font-semibold text-amber-500">+{run.newPostsAdded}</span> posts
                  <span className="text-ink-subtle"> · </span>+{run.newAccountsFound} creators
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
