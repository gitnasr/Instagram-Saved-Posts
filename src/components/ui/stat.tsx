import { cn } from "@/lib/utils";

interface StatProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
}

/** A single figure with its label: the one pattern for counts across the app. */
export function Stat({ label, value, hint, className }: StatProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="truncate text-2xl font-semibold tracking-tight text-ink">{value}</p>
      {hint && <div className="mt-0.5 text-xs text-ink-subtle">{hint}</div>}
    </div>
  );
}
