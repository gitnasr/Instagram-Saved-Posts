"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useUpdateSetting } from "@/hooks/use-settings";
import { toast } from "sonner";

interface CookieInputProps {
  currentValue?: string;
}

export function CookieInput({ currentValue }: CookieInputProps) {
  const [value, setValue] = useState("");
  const updateSetting = useUpdateSetting();

  const handleSave = () => {
    if (!value.trim()) {
      toast.error("Cookie value cannot be empty");
      return;
    }

    updateSetting.mutate(
      { key: "instagram_cookie", value: value.trim() },
      {
        onSuccess: () => {
          toast.success("Cookie saved successfully");
          setValue("");
        },
        onError: (error) => {
          toast.error(error.message);
        },
      }
    );
  };

  return (
    <div className="space-y-3">
      <Label htmlFor="cookie">Instagram Cookie</Label>
      {currentValue && (
        <p className="text-sm text-muted-foreground">
          Current: <code className="rounded bg-muted px-1.5 py-0.5">{currentValue}</code>
        </p>
      )}
      <Textarea
        id="cookie"
        placeholder="Paste your Instagram cookie string here..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={4}
        className="font-mono text-xs"
      />
      <Button
        onClick={handleSave}
        disabled={updateSetting.isPending || !value.trim()}
      >
        {updateSetting.isPending ? "Saving..." : "Save Cookie"}
      </Button>
    </div>
  );
}
