"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
  ImageIcon,
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

  const [cloudName, setCloudName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Render-time state sync pattern to avoid cascading useEffect setState
  const [syncedCloudName, setSyncedCloudName] = useState<string | null>(null);
  if (!isEditing && configData?.configured && configData.cloudName && configData.cloudName !== syncedCloudName) {
    setSyncedCloudName(configData.cloudName);
    setCloudName(configData.cloudName);
  }

  const syncState = syncStatus?.current;
  const configured = configData?.configured ?? syncStatus?.configured ?? false;
  const isSyncing = syncState?.status === "running";

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
          toast.success("Cloudinary connection verified and saved");
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  const handleDisconnect = () => {
    if (!window.confirm("Disconnect Cloudinary credentials?")) return;
    deleteConfig.mutate(undefined, {
      onSuccess: () => {
        setCloudName("");
        setApiKey("");
        setApiSecret("");
        setIsEditing(false);
        toast.success("Cloudinary disconnected");
      },
      onError: (e) => toast.error(e.message),
    });
  };

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
      size="sm"
      className="text-xs font-semibold border-hairline hover:bg-surface-2"
    >
      {isSyncing ? (
        <>
          <RefreshCw className="mr-1.5 size-3.5 animate-spin" />
          Syncing Media...
        </>
      ) : (
        <>
          <Upload className="mr-1.5 size-3.5" />
          Sync All Media to Cloudinary
        </>
      )}
    </Button>
  );

  return (
    <Card className="border border-hairline bg-surface-1 shadow-sm">
      <CardHeader className="pb-4 border-b border-hairline">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-[6px] bg-surface-2 border border-hairline text-amber-500">
              <Cloud className="size-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Cloudinary Permanent Storage</CardTitle>
              <CardDescription className="text-xs text-ink-muted">
                Archive media assets with permanent, durable URLs independent of Instagram CDN expiration
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isConfigLoading ? (
              <Badge variant="outline" className="text-[10px] font-mono">
                <Loader2 className="size-3 mr-1 animate-spin" /> Checking...
              </Badge>
            ) : configured ? (
              <Badge variant="default" className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                <CheckCircle2 className="size-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-[10px] px-2 py-0.5 font-mono">
                <AlertCircle className="size-3 mr-1" />
                Not configured
              </Badge>
            )}
            {configured && (
              <Button
                variant="ghost"
                size="icon-xs"
                className="size-7 text-ink-muted hover:text-ink"
                onClick={() => refetchConfig()}
                disabled={isConfigLoading}
                title="Refresh stats"
              >
                <RefreshCw className="size-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {/* Live Stats */}
        {configured && stats && !isEditing && (
          <div className="rounded-[6px] border border-hairline bg-surface-2/40 p-3.5 space-y-3">
            <p className="text-[10px] font-mono font-semibold text-ink-subtle uppercase tracking-wider">
              Cloudinary Account Usage ({configData?.cloudName})
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-[6px] border border-hairline bg-surface-1 p-2.5 text-center space-y-0.5">
                <HardDrive className="size-3.5 text-amber-500 mx-auto" />
                <p className="text-[10px] font-mono text-ink-subtle">Storage</p>
                <p className="text-xs font-mono font-bold text-ink">
                  {formatBytes(stats.storageUsed)}
                </p>
              </div>
              <div className="rounded-[6px] border border-hairline bg-surface-1 p-2.5 text-center space-y-0.5">
                <ImageIcon className="size-3.5 text-amber-500 mx-auto" />
                <p className="text-[10px] font-mono text-ink-subtle">Assets</p>
                <p className="text-xs font-mono font-bold text-ink">
                  {stats.resources.toLocaleString()}
                </p>
              </div>
              <div className="rounded-[6px] border border-hairline bg-surface-1 p-2.5 text-center space-y-0.5">
                <Zap className="size-3.5 text-amber-500 mx-auto" />
                <p className="text-[10px] font-mono text-ink-subtle">Plan</p>
                <p className="text-xs font-mono font-bold text-ink capitalize">{stats.plan}</p>
              </div>
            </div>

            {stats.storageLimit > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono text-ink-muted">
                  <span>Storage</span>
                  <span>
                    {formatBytes(stats.storageUsed)} / {formatBytes(stats.storageLimit)}
                  </span>
                </div>
                <Progress value={storagePercent} className="h-1.5 bg-surface-2 [&>div]:bg-amber-500" />
              </div>
            )}
          </div>
        )}

        {/* Credentials Form */}
        {(!configured || isEditing) && !isViewer && (
          <div className="space-y-3 p-3.5 rounded-[6px] border border-hairline bg-surface-2/40">
            <p className="text-xs font-semibold text-ink uppercase tracking-wider font-mono">
              {configured ? "Update Credentials" : "Enter Cloudinary Credentials"}
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="cloud-name-settings" className="text-xs font-semibold text-ink-subtle uppercase tracking-wider">Cloud Name</Label>
              <Input
                id="cloud-name-settings"
                placeholder="e.g. my-cloud"
                value={cloudName}
                onChange={(e) => setCloudName(e.target.value)}
                className="font-mono text-xs bg-surface-1"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="api-key-settings" className="text-xs font-semibold text-ink-subtle uppercase tracking-wider">API Key</Label>
              <Input
                id="api-key-settings"
                placeholder="123456789012345"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="font-mono text-xs bg-surface-1"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="api-secret-settings" className="text-xs font-semibold text-ink-subtle uppercase tracking-wider">API Secret</Label>
              <div className="relative">
                <Input
                  id="api-secret-settings"
                  type={showSecret ? "text" : "password"}
                  placeholder="••••••••••••••••••••••••••"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  className="font-mono text-xs bg-surface-1 pr-9"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="absolute right-1 top-1/2 -translate-y-1/2 size-7 text-ink-muted hover:text-ink"
                  onClick={() => setShowSecret(!showSecret)}
                >
                  {showSecret ? (
                    <EyeOff className="size-3.5" />
                  ) : (
                    <Eye className="size-3.5" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                onClick={handleSaveCredentials}
                disabled={saveConfig.isPending || !cloudName || !apiKey || !apiSecret}
                size="sm"
                className="text-xs font-semibold gap-1.5"
              >
                {saveConfig.isPending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" /> Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-3.5" /> Save & Test Connection
                  </>
                )}
              </Button>
              {isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
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

        {/* Edit / Disconnect buttons */}
        {configured && !isEditing && !isViewer && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-semibold border-hairline hover:bg-surface-2"
              onClick={() => setIsEditing(true)}
            >
              Update Credentials
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1.5"
              onClick={handleDisconnect}
              disabled={deleteConfig.isPending}
            >
              <Trash2 className="size-3.5" />
              {deleteConfig.isPending ? "Removing..." : "Disconnect"}
            </Button>
          </div>
        )}

        {/* Bulk Sync Box */}
        <div className="p-3.5 rounded-[6px] border border-hairline bg-surface-2/40 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-ink">Bulk Media Sync</p>
              <p className="text-[11px] text-ink-subtle">
                Uploads all historical account pictures and saved post carousels.
              </p>
            </div>
            {isViewer ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>{syncButton}</span>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs bg-surface-2 border border-hairline">
                    Viewers do not have permission to sync media.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              syncButton
            )}
          </div>

          {isSyncing && syncState && (
            <div className="space-y-2 pt-2 border-t border-hairline">
              <div className="flex justify-between text-[11px] font-mono text-ink-muted">
                <span>Progress: {syncPercent}%</span>
                <span>{syncDone} of {syncTotal} items</span>
              </div>
              <Progress value={syncPercent} className="h-1.5 bg-surface-2 [&>div]:bg-amber-500" />
              <div className="flex flex-wrap gap-4 text-[10px] font-mono text-ink-subtle">
                <span>Accounts: {syncState.uploadedAccounts}/{syncState.totalAccounts}</span>
                <span>Posts: {syncState.uploadedPosts}/{syncState.totalPosts}</span>
                <span>Carousel: {syncState.uploadedCarouselItems}/{syncState.totalCarouselItems}</span>
                {syncState.failedUploads > 0 && (
                  <span className="text-red-400 font-bold">{syncState.failedUploads} failed</span>
                )}
              </div>
            </div>
          )}

          {syncState?.status === "completed" && (
            <p className="text-[11px] font-mono text-ink-subtle pt-1 border-t border-hairline">
              Latest sync: {syncState.uploadedAccounts + syncState.uploadedPosts + syncState.uploadedCarouselItems} items uploaded
              {syncState.failedUploads > 0 && ` · ${syncState.failedUploads} failed`}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
