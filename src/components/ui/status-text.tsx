import { cn } from "@/lib/utils";

const TONE = {
  success: { dot: "bg-success", text: "text-success" },
  warn: { dot: "bg-primary", text: "text-highlight" },
  danger: { dot: "bg-danger", text: "text-danger" },
  muted: { dot: "bg-ink-subtle", text: "text-ink-muted" },
} as const;

interface StatusTextProps {
  tone?: keyof typeof TONE;
  /** Pulse the dot for work that is still in progress. */
  live?: boolean;
  className?: string;
  children: React.ReactNode;
}

/** Status as a dot plus a word. Replaces bordered pill badges. */
export function StatusText({ tone = "muted", live, className, children }: StatusTextProps) {
  const t = TONE[tone];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", t.text, className)}>
      <span aria-hidden className={cn("size-1.5 rounded-full", t.dot, live && "animate-pulse")} />
      {children}
    </span>
  );
}
