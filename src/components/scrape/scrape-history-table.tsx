"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { ScrapeRun } from "@/types";

interface ScrapeHistoryTableProps {
  runs: ScrapeRun[];
}

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

export function ScrapeHistoryTable({ runs }: ScrapeHistoryTableProps) {
  const router = useRouter();

  if (runs.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No scrape runs yet. Click &quot;Run Scraper&quot; to get started.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Run</TableHead>
          <TableHead>Started</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Pages</TableHead>
          <TableHead className="text-right">Posts Found</TableHead>
          <TableHead className="text-right">New Posts</TableHead>
          <TableHead className="text-right">New Accounts</TableHead>
          <TableHead>Duration</TableHead>
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

          return (
            <TableRow
              key={run.id}
              className={cn(
                "cursor-pointer hover:bg-accent",
                isFailed && "bg-destructive/5"
              )}
              onClick={() => router.push(`/scrape/${run.id}`)}
            >
              <TableCell className="font-medium">#{run.id}</TableCell>
              <TableCell>
                <div>
                  {format(started, "MMM d, yyyy HH:mm")}
                  {isFailed && run.errorMessage && (
                    <p className="text-xs text-destructive mt-0.5 max-w-[200px] truncate">
                      {run.errorMessage}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant(run.status)}>
                  {run.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {run.pagesScraped}
              </TableCell>
              <TableCell className="text-right">
                {run.totalPostsFound}
              </TableCell>
              <TableCell className="text-right">
                {run.newPostsAdded}
              </TableCell>
              <TableCell className="text-right">
                {run.newAccountsFound}
              </TableCell>
              <TableCell>
                {duration !== null ? `${duration}s` : "-"}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
