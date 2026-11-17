import type { UpgradeLevel } from "@/lib/updates";

/** Shared wording and tone for the sidebar indicator and the settings card. */
export const LEVEL_UI: Record<UpgradeLevel, { label: string; text: string; dot: string; badge: string }> = {
  routine: {
    label: "Routine update",
    text: "text-ink-muted",
    dot: "bg-success",
    badge: "border-hairline bg-transparent text-ink-muted",
  },
  attention: {
    label: "Needs attention",
    text: "text-highlight",
    dot: "bg-primary",
    badge: "border-primary/30 bg-primary/10 text-highlight",
  },
  breaking: {
    label: "Breaking change",
    text: "text-danger",
    dot: "bg-danger",
    badge: "border-danger/30 bg-danger/10 text-danger",
  },
  unknown: {
    label: "No summary",
    text: "text-ink-muted",
    dot: "bg-ink-subtle",
    badge: "border-hairline bg-transparent text-ink-muted",
  },
};
