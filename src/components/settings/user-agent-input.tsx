"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateSetting } from "@/hooks/use-settings";
import { DEFAULT_USER_AGENT } from "@/lib/constants";
import { toast } from "sonner";

interface UserAgentInputProps {
  currentValue?: string;
}

export function UserAgentInput({ currentValue }: UserAgentInputProps) {
  const [value, setValue] = useState(currentValue ?? DEFAULT_USER_AGENT);
  const updateSetting = useUpdateSetting();

  useEffect(() => {
    if (currentValue) {
      setValue(currentValue);
    }
  }, [currentValue]);

  const handleSave = () => {
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
    setValue(DEFAULT_USER_AGENT);
  };

  return (
    <div className="space-y-3">
      <Label htmlFor="user-agent">User-Agent</Label>
      <Input
        id="user-agent"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="font-mono text-xs"
      />
      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          disabled={updateSetting.isPending}
        >
          {updateSetting.isPending ? "Saving..." : "Save User-Agent"}
        </Button>
        <Button variant="outline" onClick={handleReset}>
          Reset to Default
        </Button>
      </div>
    </div>
  );
}
