"use client";

import { Check, Compass, ExternalLink, Info } from "lucide-react";
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
  openAccountTab,
} from "@/hooks/use-account-tab-behavior";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function NavigationSettings() {
  const [behavior, setBehavior] = useAccountTabBehavior();

  const handleSelect = (next: AccountTabBehavior) => {
    setBehavior(next);
    toast.success(
      next === "stay-on-page"
        ? "Account links will now keep focus on the current page"
        : "Account links will now switch to the new tab"
    );
  };

  const handleTest = () => {
    // Open a test window
    const win = openAccountTab("instagram", behavior);
    if (!win) {
      toast.error("Pop-up was blocked. Please allow pop-ups for this site.");
    } else {
      toast.success(
        behavior === "stay-on-page"
          ? "Opened test account with 'Stay on page' behavior"
          : "Opened test account in a new active tab"
      );
    }
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
              Choose whether clicking an account card switches to the new tab or stays on the current page.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-5">
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Option 1: Switch to new tab */}
          <button
            type="button"
            onClick={() => handleSelect("switch-tab")}
            className={cn(
              "flex flex-col items-start gap-2 rounded-[8px] border p-4 text-left transition-all",
              behavior === "switch-tab"
                ? "border-primary bg-surface-2 ring-1 ring-primary/40 shadow-sm"
                : "border-hairline bg-surface-1 hover:border-hairline-strong hover:bg-surface-2/60"
            )}
          >
            <div className="flex w-full items-center justify-between">
              <span className="flex items-center gap-2 font-semibold text-sm text-ink">
                <ExternalLink className="size-4 text-amber-500" />
                Switch to new tab
              </span>
              <div className="flex items-center gap-1.5">
                <Badge
                  variant="outline"
                  className="font-mono text-[9px] uppercase tracking-wider text-ink-muted border-hairline"
                >
                  Default
                </Badge>
                {behavior === "switch-tab" && (
                  <Check className="size-4 text-primary" />
                )}
              </div>
            </div>
            <p className="text-xs leading-relaxed text-ink-muted">
              Immediately switches your active browser tab to the newly opened account.
            </p>
          </button>

          {/* Option 2: Stay on current page */}
          <button
            type="button"
            onClick={() => handleSelect("stay-on-page")}
            className={cn(
              "flex flex-col items-start gap-2 rounded-[8px] border p-4 text-left transition-all",
              behavior === "stay-on-page"
                ? "border-primary bg-surface-2 ring-1 ring-primary/40 shadow-sm"
                : "border-hairline bg-surface-1 hover:border-hairline-strong hover:bg-surface-2/60"
            )}
          >
            <div className="flex w-full items-center justify-between">
              <span className="flex items-center gap-2 font-semibold text-sm text-ink">
                <Compass className="size-4 text-amber-500" />
                Stay on current page
              </span>
              <div className="flex items-center gap-1.5">
                <Badge
                  variant="outline"
                  className="font-mono text-[9px] uppercase tracking-wider text-primary border-primary/30 bg-primary/10"
                >
                  Bulk friendly
                </Badge>
                {behavior === "stay-on-page" && (
                  <Check className="size-4 text-primary" />
                )}
              </div>
            </div>
            <p className="text-xs leading-relaxed text-ink-muted">
              Keeps focus on your current list so you can open multiple accounts in bulk without jumping back and forth.
            </p>
          </button>
        </div>

        {/* Tip / Browser note */}
        <div className="flex items-start gap-2.5 rounded-[6px] border border-hairline bg-surface-2/50 p-3 text-xs text-ink-muted leading-relaxed">
          <Info className="size-4 shrink-0 text-amber-500 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium text-ink">Power-user browser shortcuts:</p>
            <p>
              In Chrome and Edge, you can also <strong className="text-ink">Middle-Click</strong> (scroll wheel) or hold{" "}
              <strong className="text-ink">Ctrl</strong> (<strong className="text-ink">Cmd</strong> on Mac) while clicking any account card to open it natively in a background tab.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-ink-subtle">
            Active preference:{" "}
            <strong className="text-ink font-mono">
              {behavior === "stay-on-page" ? "Stay on current page" : "Switch to new tab"}
            </strong>
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleTest}
            className="text-xs h-8 gap-1.5"
          >
            <ExternalLink className="size-3.5" />
            Test Account Open
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
