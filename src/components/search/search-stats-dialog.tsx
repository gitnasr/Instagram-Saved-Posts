"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusText } from "@/components/ui/status-text";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ExternalLink } from "lucide-react";
import type { useVectorIndexStatus } from "@/hooks/use-vector-search";

export type IndexStatus = NonNullable<ReturnType<typeof useVectorIndexStatus>["data"]>;

interface SearchStatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: IndexStatus | undefined;
  isLoading: boolean;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="font-mono text-foreground">{value}</dd>
    </div>
  );
}

/** Loaded on demand: only fetched when someone opens Statistics. */
export function SearchStatsDialog({ open, onOpenChange, status, isLoading }: SearchStatsDialogProps) {
  const stats = status?.stats;
  const liveness = status?.liveness;
  const dashboardUrl = liveness?.dashboardUrl || null;

  const indexTone =
    stats?.status === "failed"
      ? "danger"
      : stats?.status === "completed"
        ? "success"
        : stats?.status === "running"
          ? "warn"
          : "muted";
  const indexLabel =
    stats?.status === "failed"
      ? "Failed"
      : stats?.status === "completed"
        ? "Completed"
        : stats?.status === "running"
          ? "Running"
          : "Not indexed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Search statistics</DialogTitle>
          <DialogDescription className="text-xs text-ink-muted">
            Index coverage and Qdrant status for the active profile.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2 py-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <div className="space-y-4 text-sm">
            <section>
              <h3 className="text-eyebrow mb-1 text-ink-subtle">Index</h3>
              <dl className="divide-y divide-hairline/60">
                <Row label="Status" value={<StatusText tone={indexTone}>{indexLabel}</StatusText>} />
                <Row
                  label="Last run"
                  value={stats?.lastRunAt ? new Date(stats.lastRunAt).toLocaleString() : "Never"}
                />
                <Row
                  label="Post cutoff"
                  value={stats?.cutoffPostDate ? new Date(stats.cutoffPostDate).toLocaleDateString() : "None"}
                />
                <Row label="Indexed items" value={`${stats?.indexedItems ?? 0} / ${stats?.totalItems ?? 0}`} />
                <Row label="Faces found" value={stats?.facesIndexed ?? 0} />
              </dl>
              {stats?.lastError || (stats?.failedItems ?? 0) > 0 ? (
                <p className="mt-2 break-all rounded-sm bg-red-500/10 p-2 font-mono text-xs text-red-300">
                  {(stats?.failedItems ?? 0) > 0 && `Failed items: ${stats?.failedItems} · `}
                  {stats?.lastError || "Unknown error"}
                </p>
              ) : null}
            </section>

            <section>
              <h3 className="text-eyebrow mb-1 text-ink-subtle">Qdrant</h3>
              <dl className="divide-y divide-hairline/60">
                <Row label="Status" value={liveness?.status ?? "unknown"} />
                <Row
                  label="Image vectors"
                  value={(liveness?.collections.post_images.pointsCount ?? 0).toLocaleString()}
                />
                <Row
                  label="Face vectors"
                  value={(liveness?.collections.post_faces.pointsCount ?? 0).toLocaleString()}
                />
                <Row label="Latency" value={`${liveness?.latencyMs ?? 0} ms`} />
              </dl>
            </section>
          </div>
        )}

        <DialogFooter className="flex w-full justify-between sm:justify-between">
          {dashboardUrl ? (
            <Button asChild variant="outline" className="gap-1.5 text-xs">
              <a href={dashboardUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-3.5" />
                Qdrant dashboard
              </a>
            </Button>
          ) : (
            <div />
          )}
          <Button onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
