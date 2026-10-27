"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useUpdates } from "@/hooks/use-updates";
import { worstLevel } from "@/lib/updates";
import { LEVEL_UI } from "@/lib/update-level";

/** Quiet link to Settings, rendered only when a newer stable release exists. */
export function UpdateIndicator() {
  const { data } = useUpdates();
  if (data?.status !== "ok" || !data.updateAvailable || !data.latest) return null;

  const level = worstLevel(data.missed);
  const ui = LEVEL_UI[level];
  const summary =
    level === "routine" || level === "unknown" ? "" : `, ${ui.label.toLowerCase()}`;

  return (
    <Link
      href="/settings"
      aria-label={`Update available: version ${data.latest.version}${summary}. Open settings.`}
      title={`v${data.latest.version} is available`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-1 py-0.5 text-[10px] transition-colors hover:text-foreground hover:bg-surface-2/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        ui.text,
        level !== "routine" && level !== "unknown" && "font-semibold",
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", ui.dot)} />
      Update
    </Link>
  );
}
