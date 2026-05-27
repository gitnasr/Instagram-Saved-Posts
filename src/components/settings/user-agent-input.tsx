"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateSetting } from "@/hooks/use-settings";
import { DEFAULT_USER_AGENT } from "@/lib/constants";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface UserAgentInputProps {
  currentValue?: string;
}

export function UserAgentInput({ currentValue }: UserAgentInputProps) {
  // The parent remounts this via `key` when the persisted value changes,
  // so initializing state from the prop is sufficient (no effect needed).
  const [value, setValue] = useState(currentValue ?? DEFAULT_USER_AGENT);
  const updateSetting = useUpdateSetting();
  const { data: auth, isLoading: isAuthLoading } = useAuth();
  const isViewer = auth?.isViewer ?? false;

  const handleSave = () => {
    if (isViewer) return;
    if (!value.trim()) {
      toast.error("User-Agent cannot be empty");
      return;
    }

    updateSetting.mutate(
      { key: "user_agent", value: value.trim() },
      {
        onSuccess: () => {
          toast.success("User-Agent saved successfully");
        },
        onError: (error) => {
          toast.error(error.message);
        },
      }
    );
  };

  const handleReset = () => {
    if (isViewer) return;
    setValue(DEFAULT_USER_AGENT);
  };

  const saveDisabled = updateSetting.isPending || isAuthLoading || isViewer;
  const resetDisabled = isAuthLoading || isViewer;

  const saveButton = (
    <Button
      onClick={handleSave}
      disabled={saveDisabled}
    >
      {updateSetting.isPending ? "Saving..." : "Save User-Agent"}
    </Button>
  );

  const resetButton = (
    <Button variant="outline" onClick={handleReset} disabled={resetDisabled}>
      Reset to Default
    </Button>
  );

  return (
    <div className="space-y-3">
      <Label htmlFor="user-agent">User-Agent</Label>
      <Input
        id="user-agent"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="font-mono text-xs"
        disabled={isViewer || isAuthLoading}
      />
      <div className="flex gap-2">
        {isViewer ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>{saveButton}</span>
              </TooltipTrigger>
              <TooltipContent>
                Viewers do not have permission to update settings.
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>{resetButton}</span>
              </TooltipTrigger>
              <TooltipContent>
                Viewers do not have permission to update settings.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <>
            {saveButton}
            {resetButton}
          </>
        )}
      </div>
    </div>
  );
}
