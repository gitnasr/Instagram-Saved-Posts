"use client";

import { Button } from "@/components/ui/button";
import { Play, Loader2 } from "lucide-react";
import { useTriggerScrape } from "@/hooks/use-scrape";
import { toast } from "sonner";

interface ScrapeButtonProps {
  isRunning: boolean;
}

export function ScrapeButton({ isRunning }: ScrapeButtonProps) {
  const triggerScrape = useTriggerScrape();

  const handleClick = () => {
    triggerScrape.mutate(undefined, {
      onSuccess: () => {
        toast.success("Scrape started");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  };

  return (
    <Button
      onClick={handleClick}
      disabled={isRunning || triggerScrape.isPending}
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
}
