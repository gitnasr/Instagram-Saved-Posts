"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Cloud, Save, Upload } from "lucide-react";
import {
  useCloudinarySyncStatus,
  useTriggerCloudinarySync,
} from "@/hooks/use-cloudinary-sync";
import type { Setting } from "@/types";

interface CloudinarySettingsProps {
  settings: Setting[];
}

function getSettingValue(settings: Setting[], key: string): string {
  return settings.find((s) => s.key === key)?.value ?? "";
}

export function CloudinarySettings({ settings }: CloudinarySettingsProps) {
  const [cloudName, setCloudName] = useState(
    getSettingValue(settings, "cloudinary_cloud_name")
  );
  const [apiKey, setApiKey] = useState(
    getSettingValue(settings, "cloudinary_api_key")
  );
  // Never initialize from masked value — secret field stays empty unless user types a new one
  const hasExistingSecret = !!getSettingValue(settings, "cloudinary_api_secret");
  const [apiSecret, setApiSecret] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: syncStatus } = useCloudinarySyncStatus();
  const triggerSync = useTriggerCloudinarySync();

  const syncState = syncStatus?.current;
  const isSyncing = syncState?.status === "running";

  // Toast on sync completion
  const [prevStatus, setPrevStatus] = useState<string | undefined>();
  useEffect(() => {
    if (prevStatus === "running" && syncState?.status === "completed") {
      const total =
        syncState.uploadedAccounts +
        syncState.uploadedPosts +
        syncState.uploadedCarouselItems;
      toast.success(
        `Cloudinary sync complete: ${total} items uploaded${syncState.failedUploads > 0 ? `, ${syncState.failedUploads} failed` : ""}`
      );
    } else if (prevStatus === "running" && syncState?.status === "failed") {
      toast.error(`Cloudinary sync failed: ${syncState.errorMessage ?? "Unknown error"}`);
    }
    setPrevStatus(syncState?.status);
  }, [syncState?.status, syncState, prevStatus]);

  const saveSetting = async (key: string, value: string) => {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    if (!res.ok) throw new Error("Failed to save setting");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const saves = [
        saveSetting("cloudinary_cloud_name", cloudName.trim()),
        saveSetting("cloudinary_api_key", apiKey.trim()),
      ];
      // Only save secret if user typed a new one (don't overwrite with empty/masked value)
      if (apiSecret.trim()) {
        saves.push(saveSetting("cloudinary_api_secret", apiSecret.trim()));
      }
      await Promise.all(saves);
      toast.success("Cloudinary settings saved");
    } catch {
      toast.error("Failed to save Cloudinary settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSync = () => {
    triggerSync.mutate();
  };

  // Calculate sync progress percentage
  const syncTotal =
    (syncState?.totalAccounts ?? 0) +
    (syncState?.totalPosts ?? 0) +
    (syncState?.totalCarouselItems ?? 0);
  const syncDone =
    (syncState?.uploadedAccounts ?? 0) +
    (syncState?.uploadedPosts ?? 0) +
    (syncState?.uploadedCarouselItems ?? 0) +
    (syncState?.failedUploads ?? 0);
  const syncPercent = syncTotal > 0 ? Math.round((syncDone / syncTotal) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="h-5 w-5" />
          Cloudinary
        </CardTitle>
        <CardDescription>
          Store profile photos and post images on Cloudinary for permanent URLs.
          Instagram CDN links expire — uploads happen automatically during scraping
          when credentials are configured.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="cloud-name" className="text-sm">
              Cloud Name
            </Label>
            <Input
              id="cloud-name"
              placeholder="your-cloud-name"
              value={cloudName}
              onChange={(e) => setCloudName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="api-key" className="text-sm">
              API Key
            </Label>
            <Input
              id="api-key"
              placeholder="123456789012345"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="api-secret" className="text-sm">
              API Secret
            </Label>
            <Input
              id="api-secret"
              type="password"
              placeholder={hasExistingSecret ? "Secret is saved — leave blank to keep" : "Enter API secret"}
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save Cloudinary Settings"}
        </Button>

        <Separator />

        {/* Bulk Sync to Cloudinary */}
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium">Sync All Media to Cloudinary</p>
            <p className="text-xs text-muted-foreground">
              Upload all existing media that hasn&apos;t been uploaded yet. Run a
              scrape first to refresh expired CDN URLs.
            </p>
          </div>

          <Button
            onClick={handleSync}
            disabled={isSyncing || !cloudName || !apiKey || (!apiSecret && !hasExistingSecret)}
            variant="outline"
            className="w-full"
          >
            <Upload className="mr-2 h-4 w-4" />
            {isSyncing ? "Syncing..." : "Sync All Media"}
          </Button>

          {isSyncing && syncState && (
            <div className="space-y-2">
              <Progress value={syncPercent} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  Accounts: {syncState.uploadedAccounts}/{syncState.totalAccounts}
                </span>
                <span>
                  Posts: {syncState.uploadedPosts}/{syncState.totalPosts}
                </span>
                <span>
                  Carousel: {syncState.uploadedCarouselItems}/{syncState.totalCarouselItems}
                </span>
              </div>
              {syncState.failedUploads > 0 && (
                <p className="text-xs text-destructive">
                  {syncState.failedUploads} failed (expired URLs?)
                </p>
              )}
            </div>
          )}

          {syncState?.status === "completed" && (
            <p className="text-xs text-muted-foreground">
              Last sync: {syncState.uploadedAccounts + syncState.uploadedPosts + syncState.uploadedCarouselItems} uploaded
              {syncState.failedUploads > 0 && `, ${syncState.failedUploads} failed`}
            </p>
          )}

          {syncState?.status === "failed" && (
            <p className="text-xs text-destructive">
              Sync failed: {syncState.errorMessage}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
