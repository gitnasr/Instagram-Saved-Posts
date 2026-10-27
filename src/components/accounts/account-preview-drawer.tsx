"use client";

import { useEffect } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountDetailView } from "@/components/accounts/account-detail-view";
import {
  useAccountDrawerState,
  closeAccountDrawer,
  setAccountDrawerIndex,
} from "@/hooks/use-account-drawer";
import { cn } from "@/lib/utils";

export function AccountPreviewDrawer() {
  const { isOpen, usernames, activeIndex } = useAccountDrawerState();
  const activeUsername = usernames[activeIndex];
  const hasMultiple = usernames.length > 1;

  useEffect(() => {
    if (!isOpen || !hasMultiple) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not intercept if focus is in an input/textarea
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "ArrowLeft" && activeIndex > 0) {
        e.preventDefault();
        setAccountDrawerIndex(activeIndex - 1);
      } else if (e.key === "ArrowRight" && activeIndex < usernames.length - 1) {
        e.preventDefault();
        setAccountDrawerIndex(activeIndex + 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, hasMultiple, activeIndex, usernames.length]);

  return (
    <DialogPrimitive.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) closeAccountDrawer();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/75 backdrop-blur-sm"
        />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            "fixed inset-y-0 right-0 z-50 flex w-full max-w-4xl flex-col border-l border-hairline bg-canvas text-foreground shadow-2xl outline-none duration-200",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right"
          )}
        >
          {/* Sticky Drawer Header */}
          <div className="flex items-center justify-between gap-3 border-b border-hairline bg-surface-1 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3 min-w-0">
              <DialogPrimitive.Title className="text-sm font-semibold text-ink truncate">
                {activeUsername ? `@${activeUsername}` : "Account Details"}
              </DialogPrimitive.Title>
              {hasMultiple && (
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={activeIndex <= 0}
                    onClick={() => setAccountDrawerIndex(activeIndex - 1)}
                    className="h-7 px-2 text-xs"
                    aria-label="Previous selected account"
                  >
                    <ChevronLeft className="size-3.5" />
                    Prev
                  </Button>
                  <span className="font-mono text-xs text-ink-muted px-1.5">
                    {activeIndex + 1} / {usernames.length}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={activeIndex >= usernames.length - 1}
                    onClick={() => setAccountDrawerIndex(activeIndex + 1)}
                    className="h-7 px-2 text-xs"
                    aria-label="Next selected account"
                  >
                    Next
                    <ChevronRight className="size-3.5" />
                  </Button>
                </div>
              )}
            </div>

            <DialogPrimitive.Close asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="text-ink-muted hover:text-ink"
                aria-label="Close account drawer"
              >
                <X className="size-4" />
              </Button>
            </DialogPrimitive.Close>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {activeUsername && (
              <AccountDetailView
                username={activeUsername}
                showBreadcrumb={false}
                showFullPageLink
              />
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
