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
        toast.success("Scrape started");
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
      size="lg"
    >
      {isRunning ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Scraping...
        </>
      ) : (
        <>
          <Play className="mr-2 h-4 w-4" />
          Run Scraper
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
          <TooltipContent>
            Viewers do not have permission to run the scraper.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return buttonElement;
}
