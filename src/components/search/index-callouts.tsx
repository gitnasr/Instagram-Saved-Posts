"use client";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Database, ExternalLink, RefreshCw, Sparkles, X } from "lucide-react";
import { VECTOR_SEARCH_DOCS_URL } from "@/lib/constants";
import type { IndexStatus } from "@/components/search/search-stats-dialog";

type Tone = "neutral" | "warn" | "danger";

const TONE: Record<Tone, string> = {
  neutral: "border-hairline bg-surface-1",
  warn: "border-amber-500/30 bg-amber-500/5",
  danger: "border-red-500/30 bg-red-500/5",
};

/** One banner shape for every search notice: icon, title and detail, optional action. */
function Callout({
  tone = "neutral",
  icon,
  title,
  children,
  action,
}: {
  tone?: Tone;
  icon: React.ReactNode;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={`flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between ${TONE[tone]}`}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <div className="min-w-0 text-sm">
          <p className="font-medium text-foreground">{title}</p>
          {children && <div className="text-xs text-ink-muted">{children}</div>}
        </div>
      </div>
      {action}
    </div>
  );
}

interface IndexCalloutsProps {
  status: IndexStatus | undefined;
  isLoading: boolean;
  errorMessage: string | null;
  onDismissError: () => void;
  onReindex: () => void;
  reindexPending: boolean;
}

export function IndexCallouts({
  status,
  isLoading,
  errorMessage,
  onDismissError,
  onReindex,
  reindexPending,
}: IndexCalloutsProps) {
  const current = status?.current;
  const stats = status?.stats;
  // Search is opt-in: no QDRANT_URL means the feature was never switched on, which is normal.
  const enabled = status?.configured ?? false;
  const running = current?.status === "running";
  const failed = enabled && !isLoading && !running && stats?.status === "failed";
  const neverIndexed =
    enabled && !isLoading && !running && !failed && (!stats || stats.indexedItems === 0);
  const progress =
    current && current.totalItems > 0
      ? Math.round((current.indexedItems / current.totalItems) * 100)
      : 0;

  return (
    <>
      {!isLoading && !enabled && (
        <Callout
          icon={<Database className="size-4 text-ink-muted" />}
          title="Vector Search is not enabled"
          action={
            <Button asChild size="sm" variant="outline" className="shrink-0 gap-1.5 text-xs">
              <a href={VECTOR_SEARCH_DOCS_URL} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-3.5" />
                How to enable it
              </a>
            </Button>
          }
        >
          It&apos;s an optional beta feature that needs a Qdrant service and the{" "}
          <code className="rounded bg-black/30 px-1 py-0.5 font-mono">QDRANT_URL</code> variable. The
          embedding models are a heavy addition most archives don&apos;t need.
        </Callout>
      )}

      {failed && (
        <Callout
          tone="danger"
          icon={<AlertCircle className="size-4 text-red-400" />}
          title="Last index run failed"
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={onReindex}
              disabled={reindexPending || running}
              className="shrink-0 gap-1.5"
            >
              <RefreshCw className="size-3.5" />
              Retry
            </Button>
          }
        >
          <span className="break-all font-mono">{stats?.lastError || "Unknown error"}</span>
        </Callout>
      )}

      {neverIndexed && (
        <Callout
          tone="warn"
          icon={<Database className="size-4 text-amber-400" />}
          title="Archive not indexed yet"
          action={
            <Button size="sm" onClick={onReindex} disabled={reindexPending || running} className="shrink-0 gap-1.5">
              <Sparkles className="size-3.5" />
              Index archive
            </Button>
          }
        >
          Saved posts must be embedded into Qdrant before searches can find matches.
        </Callout>
      )}

      {errorMessage && (
        <Callout
          tone="danger"
          icon={<AlertCircle className="size-4 text-red-400" />}
          title={errorMessage}
          action={
            <button
              type="button"
              aria-label="Dismiss"
              onClick={onDismissError}
              className="self-start text-ink-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          }
        />
      )}

      {running && current && (
        <Callout icon={<Database className="size-4 animate-pulse text-amber-500" />} title="Indexing archive…">
          <div className="mt-1 space-y-1.5">
            <Progress value={progress} className="h-1.5 bg-surface-3" />
            <p className="font-mono">
              {current.indexedItems} / {current.totalItems} items ({progress}%) · faces{" "}
              {current.facesIndexed}
              {current.failedItems > 0 && <span className="text-red-400"> · failures {current.failedItems}</span>}
            </p>
          </div>
        </Callout>
      )}
    </>
  );
}
