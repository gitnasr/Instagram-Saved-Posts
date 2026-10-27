import type { UpgradeLevel } from "@/lib/updates";

/** Shared wording and tone for the sidebar indicator and the settings card. */
export const LEVEL_UI: Record<UpgradeLevel, { label: string; text: string; dot: string; badge: string }> = {
  routine: {
    label: "Routine update",
    text: "text-ink-muted",
    dot: "bg-emerald-500",
    badge: "border-hairline bg-transparent text-ink-muted",
  },
  attention: {
    label: "Needs attention",
    text: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  breaking: {
    label: "Breaking change",
    text: "text-red-700 dark:text-red-400",
    dot: "bg-red-500",
    badge: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
  },
  unknown: {
    label: "No summary",
    text: "text-ink-muted",
    dot: "bg-ink-subtle",
    badge: "border-hairline bg-transparent text-ink-muted",
  },
};
