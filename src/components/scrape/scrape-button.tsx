"use client";

import { Button } from "@/components/ui/button";
import { Play, Loader2 } from "lucide-react";
import { useTriggerScrape } from "@/hooks/use-scrape";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ScrapeButtonProps {
  isRunning: boolean;
}

export function ScrapeButton({ isRunning }: ScrapeButtonProps) {
  const triggerScrape = useTriggerScrape();
  const { data: auth, isLoading: isAuthLoading } = useAuth();
  const isViewer = auth?.isViewer ?? false;

  const handleClick = () => {
    if (isViewer) return;
    triggerScrape.mutate(undefined, {
      onSuccess: () => {
        toast.success("Synchronization started");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  };

  const buttonDisabled = isRunning || triggerScrape.isPending || isAuthLoading || isViewer;

  const buttonElement = (
    <Button
      onClick={handleClick}
      disabled={buttonDisabled}
      size="default"
      className="font-semibold text-xs h-9 px-4 shadow-none"
    >
      {isRunning ? (
        <>
          <Loader2 className="mr-1.5 size-3.5 animate-spin" />
          Syncing Bookmarks...
        </>
      ) : (
        <>
          <Play className="mr-1.5 size-3.5 fill-current" />
          Run Sync
        </>
      )}
    </Button>
  );

  if (isViewer) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>{buttonElement}</span>
          </TooltipTrigger>
          <TooltipContent className="text-xs bg-surface-2 border border-hairline text-ink">
            Viewers do not have permission to run the scraper.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return buttonElement;
}
