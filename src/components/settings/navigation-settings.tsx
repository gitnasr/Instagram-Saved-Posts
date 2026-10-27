"use client";

import type { ComponentType } from "react";
import { Check, Compass, ExternalLink, PanelRightOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  useAccountTabBehavior,
  type AccountTabBehavior,
} from "@/hooks/use-account-tab-behavior";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface NavigationOption {
  value: AccountTabBehavior;
  title: string;
  description: string;
  badgeLabel: string;
  badgeClassName: string;
  Icon: ComponentType<{ className?: string }>;
  toastMessage: string;
}

const NAVIGATION_OPTIONS: NavigationOption[] = [
  {
    value: "switch-tab",
    title: "Switch to new tab",
    description:
      "Opens the account in a new browser tab and immediately switches focus to it.",
    badgeLabel: "Default",
    badgeClassName: "text-ink-muted border-hairline",
    Icon: ExternalLink,
    toastMessage: "Account links will now open and switch to a new tab",
  },
  {
    value: "stay-on-page",
    title: "Stay on current page",
    description:
      "Opens the account in an in-page slide-over drawer so you can inspect accounts without losing your place or jumping between tabs.",
    badgeLabel: "Bulk friendly",
    badgeClassName: "text-primary border-primary/30 bg-primary/10",
    Icon: PanelRightOpen,
    toastMessage:
      "Account links will now open in an in-page drawer while keeping your current page active",
  },
];

export function NavigationSettings() {
  const [behavior, setBehavior] = useAccountTabBehavior();

  const handleSelect = (option: NavigationOption) => {
    setBehavior(option.value);
    toast.success(option.toastMessage);
  };

  return (
    <Card className="border border-hairline bg-surface-1 shadow-sm">
      <CardHeader className="pb-4 border-b border-hairline">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-[6px] border border-hairline bg-surface-2 text-amber-500">
            <Compass className="size-5" />
          </div>
          <div>
            <CardTitle className="text-base">Account Navigation & Tabs</CardTitle>
            <CardDescription className="text-xs text-ink-muted">
              Choose whether clicking an account card switches to a new tab or opens in place on the current page.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-5">
        <div className="grid gap-3 sm:grid-cols-2">
          {NAVIGATION_OPTIONS.map((option) => {
            const selected = behavior === option.value;
            const { Icon } = option;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option)}
                className={cn(
                  "flex flex-col items-start gap-2 rounded-[8px] border p-4 text-left transition-all",
                  selected
                    ? "border-primary bg-surface-2 ring-1 ring-primary/40 shadow-sm"
                    : "border-hairline bg-surface-1 hover:border-hairline-strong hover:bg-surface-2/60"
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="flex items-center gap-2 font-semibold text-sm text-ink">
                    <Icon className="size-4 text-amber-500" />
                    {option.title}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-mono text-[9px] uppercase tracking-wider",
                        option.badgeClassName
                      )}
                    >
                      {option.badgeLabel}
                    </Badge>
                    {selected && <Check className="size-4 text-primary" />}
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-ink-muted">
                  {option.description}
                </p>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
