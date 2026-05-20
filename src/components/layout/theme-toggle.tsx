"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  labelText?: string;
  showLabel?: boolean;
}

export function ThemeToggle({
  className,
  labelText,
  showLabel = false,
}: ThemeToggleProps) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = mounted && resolvedTheme === "dark";
  const actionLabel = isDark ? "Light mode" : "Dark mode";

  return (
    <Button
      type="button"
      variant="outline"
      size={showLabel ? "sm" : "icon-sm"}
      className={cn(showLabel && "w-full justify-start", className)}
      aria-label={actionLabel}
      aria-pressed={mounted ? isDark : undefined}
      title={actionLabel}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? (
        <Sun data-icon="inline-start" />
      ) : (
        <Moon data-icon="inline-start" />
      )}
      {showLabel && <span>{labelText ?? actionLabel}</span>}
    </Button>
  );
}
