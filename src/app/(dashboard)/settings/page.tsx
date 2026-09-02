"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CloudinarySettings } from "@/components/settings/cloudinary-settings";
import { ProfileAvatar } from "@/components/profiles/profile-avatar";
import { useProfiles, useUpdateProfile } from "@/hooks/use-profiles";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { User, Key, Globe, Save, Tag, ExternalLink } from "lucide-react";
import { APP_VERSION, GITHUB_RELEASES_URL } from "@/lib/constants";

export default function SettingsPage() {
  const { data: profiles, isLoading } = useProfiles();
  const active = profiles?.find((p) => p.isActive);
  const update = useUpdateProfile();
  const { data: auth, isLoading: isAuthLoading } = useAuth();
  const isViewer = auth?.isViewer ?? false;

  const [name, setName] = useState("");
  const [cookie, setCookie] = useState("");
  const [userAgent, setUserAgent] = useState("");
  const [syncedProfileId, setSyncedProfileId] = useState<string | null>(null);

  if (active && active.id !== syncedProfileId) {
    setSyncedProfileId(active.id);
    setName(active.name);
  }

  const handleSave = () => {
    if (isViewer || !active) return;
    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    update.mutate(
      {
        id: active.id,
        name: name.trim(),
        ...(cookie.trim() ? { cookie: cookie.trim() } : {}),
        ...(userAgent.trim() ? { userAgent: userAgent.trim() } : {}),
      },
      {
        onSuccess: () => {
          toast.success("Profile configuration saved");
          setCookie("");
          setUserAgent("");
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  const disabled = isViewer || isAuthLoading || update.isPending;

  return (
    <div className="space-y-6">
      <Header
        title="Settings & Credentials"
        description="Configure active workspace profile credentials and external storage integrations."
      />

      {isLoading || !active ? (
        <div className="space-y-4">
          <Skeleton className="h-64 w-full rounded-[8px]" />
          <Skeleton className="h-32 w-full rounded-[8px]" />
        </div>
      ) : (
        <div className="space-y-6">
          <Card className="border border-hairline bg-surface-1 shadow-sm">
            <CardHeader className="pb-4 border-b border-hairline">
              <div className="flex items-center gap-3">
                <ProfileAvatar
                  name={active.name}
                  avatarUrl={active.avatarUrl}
                  avatarColor={active.avatarColor}
                  className="size-10 rounded-[6px] border border-hairline"
                />
                <div>
                  <CardTitle className="text-base">Workspace Profile: {active.name}</CardTitle>
                  <CardDescription className="text-xs text-ink-muted">
                    Active session identity for Instagram bookmark fetching
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              <div className="space-y-2">
                <Label htmlFor="profile-name" className="text-xs font-semibold uppercase tracking-wider text-ink-subtle flex items-center gap-1.5">
                  <User className="size-3.5 text-amber-500" />
                  Profile Name
                </Label>
                <Input
                  id="profile-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isViewer}
                  className="max-w-md text-xs font-medium"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cookie" className="text-xs font-semibold uppercase tracking-wider text-ink-subtle flex items-center gap-1.5">
                  <Key className="size-3.5 text-amber-500" />
                  Instagram Session Cookie
                </Label>
                <p className="text-xs text-ink-muted leading-relaxed">
                  {active.hasCookie
                    ? "A session cookie is configured. Paste a new cookie string below to update it."
                    : "No cookie configured yet — Instagram scraping requires an authenticated session cookie."}
                </p>
                <Textarea
                  id="cookie"
                  placeholder={
                    isViewer
                      ? "Viewers cannot edit settings"
                      : "Paste sessionid=...; ds_user_id=...; csrftoken=... cookie string here"
                  }
                  value={cookie}
                  onChange={(e) => setCookie(e.target.value)}
                  rows={4}
                  className="w-full min-w-0 break-all font-mono text-xs bg-surface-2/40"
                  disabled={isViewer}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="user-agent" className="text-xs font-semibold uppercase tracking-wider text-ink-subtle flex items-center gap-1.5">
                  <Globe className="size-3.5 text-amber-500" />
                  Custom User-Agent <span className="text-[10px] text-ink-subtle font-mono">(Optional)</span>
                </Label>
                <Input
                  id="user-agent"
                  placeholder={
                    active.hasUserAgent
                      ? "A custom user-agent is configured. Type to replace."
                      : "Defaults to Instagram Android App User-Agent"
                  }
                  value={userAgent}
                  onChange={(e) => setUserAgent(e.target.value)}
                  className="font-mono text-xs max-w-2xl bg-surface-2/40"
                  disabled={isViewer}
                />
              </div>

              <div className="pt-2 flex justify-start">
                <Button onClick={handleSave} disabled={disabled} size="sm" className="text-xs font-semibold">
                  <Save className="mr-1.5 size-3.5" />
                  {update.isPending ? "Saving Profile..." : "Save Profile Settings"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <CloudinarySettings />

          <Card className="border border-hairline bg-surface-1 shadow-sm">
            <CardHeader className="pb-3 border-b border-hairline">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Tag className="size-4 text-amber-500" />
                    Application Version & Releases
                  </CardTitle>
                  <CardDescription className="text-xs text-ink-muted mt-0.5">
                    Currently deployed version and release notes history
                  </CardDescription>
                </div>
                <span className="font-mono text-xs px-2.5 py-1 rounded bg-surface-2 border border-hairline text-foreground font-medium">
                  {APP_VERSION.startsWith("v") ? APP_VERSION : `v${APP_VERSION}`}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-4 flex items-center justify-between text-xs text-ink-muted">
              <span>
                To rollback or upgrade your deployment, specify an official version tag in your container configuration.
              </span>
              <a
                href={GITHUB_RELEASES_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-500 hover:text-amber-400 transition-colors shrink-0 ml-4"
              >
                Release Notes
                <ExternalLink className="size-3" />
              </a>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
