import type { ComponentType } from "react";
import { ChevronDown } from "lucide-react";

interface SettingsSectionProps {
  id: string;
  title: string;
  description?: string;
  icon: ComponentType<{ className?: string }>;
  /** Shown in the collapsed header so a section can be checked without opening it. */
  status?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

/** Native <details> disclosure: no JS, keyboard and screen-reader support built in. */
export function SettingsSection({
  id,
  title,
  description,
  icon: Icon,
  status,
  defaultOpen,
  children,
}: SettingsSectionProps) {
  return (
    <section id={id} className="scroll-mt-6 rounded-md border border-hairline bg-surface-1">
      <details open={defaultOpen} className="group">
        <summary className="flex cursor-pointer list-none items-center gap-3 rounded-md px-4 py-3 [&::-webkit-details-marker]:hidden">
          <Icon className="size-4 shrink-0 text-highlight" />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-medium text-ink">{title}</h2>
            {description && <p className="truncate text-xs text-ink-muted">{description}</p>}
          </div>
          {status}
          <ChevronDown className="size-4 shrink-0 text-ink-muted transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-4 border-t border-hairline px-4 py-4">{children}</div>
      </details>
    </section>
  );
}
