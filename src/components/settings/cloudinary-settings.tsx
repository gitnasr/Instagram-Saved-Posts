"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Cloud, Upload, CheckCircle2, AlertCircle } from "lucide-react";
import {
  useCloudinarySyncStatus,
  useTriggerCloudinarySync,
} from "@/hooks/use-cloudinary-sync";

export function CloudinarySettings() {
  const { data: syncStatus } = useCloudinarySyncStatus();
  const triggerSync = useTriggerCloudinarySync();

  const syncState = syncStatus?.current;
  const configured = syncStatus?.configured ?? false;
  const isSyncing = syncState?.status === "running";

  // Toast on sync completion
  const prevStatusRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    if (prevStatus === "running" && syncState?.status === "completed") {
      const total =
        syncState.uploadedAccounts +
        syncState.uploadedPosts +
        syncState.uploadedCarouselItems;
      toast.success(
        `Cloudinary sync complete: ${total} items uploaded${syncState.failedUploads > 0 ? `, ${syncState.failedUploads} failed` : ""}`
      );
    } else if (prevStatus === "running" && syncState?.status === "failed") {
      toast.error(
        `Cloudinary sync failed: ${syncState.errorMessage ?? "Unknown error"}`
      );
    }
    prevStatusRef.current = syncState?.status;
  }, [syncState?.status, syncState]);

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
          Credentials are provided through deployment environment variables and
          cannot be edited here. Uploads happen automatically during scraping
          when configured.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          {configured ? (
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Configured
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="h-3.5 w-3.5" />
              Not configured
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {configured
              ? "Cloudinary env vars are set on this deployment."
              : "Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET."}
          </span>
        </div>

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
            disabled={isSyncing || !configured}
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
                  Carousel: {syncState.uploadedCarouselItems}/
                  {syncState.totalCarouselItems}
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
              Last sync:{" "}
              {syncState.uploadedAccounts +
                syncState.uploadedPosts +
                syncState.uploadedCarouselItems}{" "}
              uploaded
              {syncState.failedUploads > 0 &&
                `, ${syncState.failedUploads} failed`}
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
