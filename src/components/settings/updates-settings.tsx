"use client";

import { formatDistanceToNow } from "date-fns";
import { Copy, ExternalLink, Loader2, RefreshCw, Tag } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useUpdates, type ReleaseInfo, type UpdatesResponse } from "@/hooks/use-updates";
import { GITHUB_RELEASES_URL } from "@/lib/constants";
import { LEVEL_UI } from "@/lib/update-level";
import { worstLevel } from "@/lib/updates";
import { cn } from "@/lib/utils";

const UPDATE_COMMAND = "docker compose pull && docker compose up -d";
const LINK = "text-amber-700 hover:underline dark:text-amber-400";

type OkResponse = Extract<UpdatesResponse, { status: "ok" }>;

const v = (version: string) => (version.startsWith("v") ? version : `v${version}`);
const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "";

/** First readable line of a release: the verdict when present, else the first non-heading line. */
function summaryLine(r: ReleaseInfo): string {
  const src = r.whatToExpect ?? r.notes;
  const line = src
    .split("\n")
    .map((l) => l.replace(/^[#>\-*\s]+/, "").trim())
    .find((l) => l && !/^full changelog/i.test(l.replace(/\*/g, "")));
  return line ?? "No release notes.";
}

function LevelBadge({ level }: { level: ReleaseInfo["upgrade"] }) {
  return (
    <Badge variant="outline" className={LEVEL_UI[level].badge}>
      {LEVEL_UI[level].label}
    </Badge>
  );
}

function Flags({ r }: { r: ReleaseInfo }) {
  const flags = [r.schema && "database", r.env && "env vars", r.compose && "compose file"].filter(Boolean);
  if (!flags.length) return null;
  return <span className="text-[11px] text-ink-subtle">Changes {flags.join(", ")}</span>;
}

function CopyCommand() {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(UPDATE_COMMAND);
      toast.success("Command copied");
    } catch {
      toast.error("Could not copy. Select the command and copy it manually.");
    }
  };
  return (
    <div className="flex items-center justify-between gap-2 rounded-[4px] border border-hairline bg-surface-2/40 py-1.5 pl-3 pr-1.5">
      <code className="min-w-0 break-all font-mono text-xs text-foreground">{UPDATE_COMMAND}</code>
      <Button variant="ghost" size="icon-xs" onClick={copy} aria-label="Copy update command">
        <Copy />
      </Button>
    </div>
  );
}

function statusLine(data: UpdatesResponse | undefined, isError: boolean) {
  if (isError || !data) return "Could not check for updates. Try again in a moment.";
  if (data.status === "disabled")
    return (
      <>
        Update check is turned off (<code className="font-mono">DISABLE_UPDATE_CHECK=true</code>). Nothing is sent to
        GitHub.{" "}
        <a href={GITHUB_RELEASES_URL} target="_blank" rel="noopener noreferrer" className={LINK}>
          Browse releases
        </a>
      </>
    );
  if (data.status === "unavailable")
    return `${data.reason}. This server may be offline or blocked from github.com. Your install is not affected.`;
  if (data.updateAvailable && data.latest)
    return (
      <span className="font-medium text-foreground">
        {v(data.latest.version)} is available
        {data.latest.publishedAt && (
          <span className="font-normal text-ink-muted"> (released {day(data.latest.publishedAt)})</span>
        )}
      </span>
    );
  if (data.latest && data.latest.version !== data.current)
    return `No newer stable release. Latest is ${v(data.latest.version)}; this build is ${v(data.current)}.`;
  return "You are on the latest version.";
}

export function UpdatesSettings() {
  const { data, isLoading, isFetching, isError, checkNow, dataUpdatedAt } = useUpdates();

  const disabled = data?.status === "disabled";
  const checkedAt = data && data.status !== "disabled" ? data.checkedAt : dataUpdatedAt || null;

  const onCheck = () => {
    checkNow().catch(() => toast.error("Could not reach this server to check for updates."));
  };

  return (
    <Card className="border border-hairline bg-surface-1 shadow-sm">
      <CardHeader className="pb-3 border-b border-hairline">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Tag className="size-4 text-amber-500" />
              Updates
            </CardTitle>
            <CardDescription className="text-xs text-ink-muted mt-0.5">
              Installed version compared with GitHub Releases
            </CardDescription>
          </div>
          {data?.current && (
            <span className="font-mono text-xs px-2.5 py-1 rounded bg-surface-2 border border-hairline text-foreground font-medium">
              {v(data.current)}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4" aria-busy={isFetching}>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-8 w-40" />
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="text-xs text-ink-muted" role="status" aria-live="polite">
              {statusLine(data, isError)}
              {!disabled && checkedAt && (
                <span className="ml-2 text-ink-subtle">
                  Checked {formatDistanceToNow(new Date(checkedAt), { addSuffix: true })}
                </span>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={onCheck} disabled={disabled || isFetching} className="text-xs">
              {isFetching ? <Loader2 className="motion-safe:animate-spin" /> : <RefreshCw />}
              {isFetching ? "Checking..." : "Check for updates"}
            </Button>
          </div>
        )}

        {data?.status === "ok" && data.updateAvailable && <UpdateDetails data={data} />}
      </CardContent>
    </Card>
  );
}

function UpdateDetails({ data }: { data: OkResponse }) {
  const latest = data.missed[0];
  const level = worstLevel(data.missed);
  const older = data.missed.slice(1);

  return (
    <div className="space-y-4">
      <section aria-label="What to expect" className="space-y-2 rounded-[6px] border border-hairline bg-surface-2/30 p-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <LevelBadge level={level} />
          <Flags r={latest} />
        </div>
        {latest.whatToExpect ? (
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{latest.whatToExpect}</p>
        ) : (
          <p className="text-xs leading-relaxed text-ink-muted">
            This release has no upgrade summary. {summaryLine(latest)}{" "}
            <a href={latest.url} target="_blank" rel="noopener noreferrer" className={LINK}>
              Read the full notes
            </a>
          </p>
        )}
        {level !== latest.upgrade && (
          <p className={cn("text-xs", LEVEL_UI[level].text)}>
            An earlier release in this range is marked &quot;{LEVEL_UI[level].label.toLowerCase()}&quot;. See below.
          </p>
        )}
      </section>

      {older.length > 0 && (
        <div className="space-y-1.5">
          <h3 className="text-xs font-semibold text-foreground">
            Also included ({older.length} earlier {older.length === 1 ? "release" : "releases"})
          </h3>
          <ul className="divide-y divide-hairline rounded-[6px] border border-hairline">
            {older.map((r) => (
              <li key={r.version} className="flex items-start justify-between gap-3 px-3 py-2">
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-mono text-xs font-medium text-foreground">{v(r.version)}</span>
                    <span className="text-[11px] text-ink-subtle">{day(r.publishedAt)}</span>
                    {r.upgrade !== "unknown" && <LevelBadge level={r.upgrade} />}
                  </div>
                  <p className="text-xs text-ink-muted line-clamp-2">{summaryLine(r)}</p>
                  <Flags r={r} />
                </div>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${v(r.version)} release notes on GitHub`}
                  className="mt-0.5 shrink-0 text-ink-muted hover:text-foreground"
                >
                  <ExternalLink className="size-3.5" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-foreground">How to update</h3>
        <p className="text-xs leading-relaxed text-ink-muted">
          This app runs in a container and cannot update itself. Run this on the host that runs it:
        </p>
        <CopyCommand />
        <p className="text-xs leading-relaxed text-ink-muted">
          On Dokploy or Coolify, redeploy the application instead. If your compose file pins a version tag, change the
          tag first.{" "}
          <a href={latest.url} target="_blank" rel="noopener noreferrer" className={cn("inline-flex items-center gap-1", LINK)}>
            Release notes <ExternalLink className="size-3" />
          </a>
        </p>
      </div>
    </div>
  );
}
