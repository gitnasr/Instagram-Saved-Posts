"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Cloud,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  HardDrive,
  Image as ImageIcon,
  Zap,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  useCloudinarySyncStatus,
  useTriggerCloudinarySync,
} from "@/hooks/use-cloudinary-sync";
import { useAuth } from "@/hooks/use-auth";
import {
  useCloudinaryConfig,
  useSaveCloudinaryConfig,
  useDeleteCloudinaryConfig,
} from "@/hooks/use-cloudinary-config";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/** Format bytes into a human-readable string (e.g. "1.2 GB") */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function CloudinarySettings() {
  const { data: syncStatus } = useCloudinarySyncStatus();
  const triggerSync = useTriggerCloudinarySync();
  const { data: auth, isLoading: isAuthLoading } = useAuth();
  const isViewer = auth?.isViewer ?? false;

  const { data: configData, isLoading: isConfigLoading, refetch: refetchConfig } =
    useCloudinaryConfig();
  const saveConfig = useSaveCloudinaryConfig();
  const deleteConfig = useDeleteCloudinaryConfig();

  // Credential form state
  const [cloudName, setCloudName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // When config loads and user is not editing, sync the cloudName field
  const prevConfiguredRef = useRef(false);
  useEffect(() => {
    if (!prevConfiguredRef.current && configData?.configured && configData.cloudName && !isEditing) {
      prevConfiguredRef.current = true;
      setCloudName(configData.cloudName);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only run when config first becomes available
  }, [configData?.configured, configData?.cloudName]);

  const syncState = syncStatus?.current;
  const configured = configData?.configured ?? syncStatus?.configured ?? false;
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
    if (isViewer) return;
    triggerSync.mutate();
  };

  const handleSaveCredentials = () => {
    if (!cloudName.trim() || !apiKey.trim() || !apiSecret.trim()) {
      toast.error("All three fields are required");
      return;
    }
    saveConfig.mutate(
      { cloudName: cloudName.trim(), apiKey: apiKey.trim(), apiSecret: apiSecret.trim() },
      {
        onSuccess: () => {
          setApiSecret("");
          setIsEditing(false);
        },
      }
    );
  };

  const handleDisconnect = () => {
    deleteConfig.mutate(undefined, {
      onSuccess: () => {
        setCloudName("");
        setApiKey("");
        setApiSecret("");
        setIsEditing(false);
      },
    });
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

  const stats = configData?.stats ?? null;
  const storagePercent =
    stats && stats.storageLimit > 0
      ? Math.min(100, Math.round((stats.storageUsed / stats.storageLimit) * 100))
      : 0;

  const syncDisabled = isSyncing || !configured || isAuthLoading || isViewer;

  const syncButton = (
    <Button
      onClick={handleSync}
      disabled={syncDisabled}
      variant="outline"
      className="w-full"
    >
      <Upload className="mr-2 h-4 w-4" />
      {isSyncing ? "Syncing..." : "Sync All Media to Cloudinary"}
    </Button>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="h-5 w-5" />
          Cloudinary CDN
        </CardTitle>
        <CardDescription>
          Store profile photos and post images on Cloudinary for permanent URLs
          that never expire. Credentials are saved securely in the database.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          {isConfigLoading ? (
            <Badge variant="outline" className="gap-1">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking...
            </Badge>
          ) : configured ? (
            <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600 gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Connected
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="h-3.5 w-3.5" /> Not configured
            </Badge>
          )}
          {configured && configData?.cloudName && (
            <span className="text-xs text-muted-foreground font-mono">
              {configData.cloudName}
            </span>
          )}
          {configured && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-7 px-2 text-xs gap-1"
              onClick={() => refetchConfig()}
              disabled={isConfigLoading}
            >
              <RefreshCw className="size-3" /> Refresh Stats
            </Button>
          )}
        </div>

        {/* Live Stats (when connected) */}
        {configured && stats && !isEditing && (
          <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Account Usage
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border bg-background p-3 text-center space-y-1">
                <HardDrive className="size-4 text-muted-foreground mx-auto" />
                <p className="text-[10px] text-muted-foreground">Storage</p>
                <p className="text-xs font-semibold">
                  {formatBytes(stats.storageUsed)}
                </p>
              </div>
              <div className="rounded-lg border bg-background p-3 text-center space-y-1">
                <ImageIcon className="size-4 text-muted-foreground mx-auto" />
                <p className="text-[10px] text-muted-foreground">Assets</p>
                <p className="text-xs font-semibold">
                  {stats.resources.toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg border bg-background p-3 text-center space-y-1">
                <Zap className="size-4 text-muted-foreground mx-auto" />
                <p className="text-[10px] text-muted-foreground">Plan</p>
                <p className="text-xs font-semibold capitalize">{stats.plan}</p>
              </div>
            </div>

            {stats.storageLimit > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Storage</span>
                  <span>
                    {formatBytes(stats.storageUsed)} / {formatBytes(stats.storageLimit)}
                  </span>
                </div>
                <Progress value={storagePercent} className="h-1.5" />
              </div>
            )}

            {stats.bandwidthLimit > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Bandwidth</span>
                  <span>
                    {formatBytes(stats.bandwidthUsed)} / {formatBytes(stats.bandwidthLimit)}
                  </span>
                </div>
                <Progress
                  value={
                    stats.bandwidthLimit > 0
                      ? Math.min(100, Math.round((stats.bandwidthUsed / stats.bandwidthLimit) * 100))
                      : 0
                  }
                  className="h-1.5"
                />
              </div>
            )}
          </div>
        )}

        {/* Stats unavailable notice */}
        {configured && configData?.statsError && !isEditing && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
            <AlertCircle className="size-3.5 shrink-0" />
            Could not load stats: {configData.statsError}
          </div>
        )}

        {/* Credentials Form */}
        {(!configured || isEditing) && !isViewer && (
          <div className="space-y-3">
            <p className="text-sm font-medium">
              {configured ? "Update Credentials" : "Enter Credentials"}
            </p>
            <div className="space-y-2">
              <Label htmlFor="cloud-name-settings">Cloud Name</Label>
              <Input
                id="cloud-name-settings"
                placeholder="e.g. my-cloud"
                value={cloudName}
                onChange={(e) => setCloudName(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="api-key-settings">API Key</Label>
              <Input
                id="api-key-settings"
                placeholder="123456789012345"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="api-secret-settings">API Secret</Label>
              <div className="relative">
                <Input
                  id="api-secret-settings"
                  type={showSecret ? "text" : "password"}
                  placeholder="••••••••••••••••••••••••••"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  className="font-mono text-sm pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setShowSecret(!showSecret)}
                >
                  {showSecret ? (
                    <EyeOff className="size-3.5" />
                  ) : (
                    <Eye className="size-3.5" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Find these in your{" "}
                <a
                  href="https://console.cloudinary.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline"
                >
                  Cloudinary Console
                </a>{" "}
                → Settings → Access keys.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSaveCredentials}
                disabled={saveConfig.isPending || !cloudName || !apiKey || !apiSecret}
                className="flex-1 gap-2"
              >
                {saveConfig.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-4" /> Save & Test Connection
                  </>
                )}
              </Button>
              {isEditing && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setApiSecret("");
                    if (configData?.cloudName) setCloudName(configData.cloudName);
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Edit / Disconnect buttons (when connected and not editing) */}
        {configured && !isEditing && !isViewer && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setIsEditing(true)}
            >
              Update Credentials
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-destructive hover:text-destructive"
              onClick={handleDisconnect}
              disabled={deleteConfig.isPending}
            >
              <Trash2 className="size-3.5" />
              {deleteConfig.isPending ? "Removing..." : "Disconnect"}
            </Button>
          </div>
        )}

        <Separator />

        {/* Bulk Sync */}
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium">Sync All Media to Cloudinary</p>
            <p className="text-xs text-muted-foreground">
              Upload all existing media that hasn&apos;t been uploaded yet. Run
              a scrape first to refresh expired CDN URLs.
            </p>
          </div>

          {isViewer ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>{syncButton}</span>
                </TooltipTrigger>
                <TooltipContent>
                  Viewers do not have permission to sync media.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            syncButton
          )}

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
