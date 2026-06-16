"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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

  // Seed the name field when the active profile loads/changes (render-time
  // sync — avoids a setState-in-effect cascade).
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
          toast.success("Profile saved");
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
        title="Settings"
        description="Configure the active profile and Instagram API credentials"
      />

      {isLoading || !active ? (
        <div className="space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <ProfileAvatar
                  name={active.name}
                  avatarUrl={active.avatarUrl}
                  avatarColor={active.avatarColor}
                  className="size-9"
                />
                Profile: {active.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profile-name">Name</Label>
                <Input
                  id="profile-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isViewer}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cookie">Instagram Cookie</Label>
                <p className="text-sm text-muted-foreground">
                  {active.hasCookie
                    ? "A cookie is configured. Paste a new one to replace it."
                    : "No cookie configured yet — scraping requires one."}
                </p>
                <Textarea
                  id="cookie"
                  placeholder={
                    isViewer
                      ? "Viewers cannot edit settings"
                      : "Paste your Instagram cookie string here..."
                  }
                  value={cookie}
                  onChange={(e) => setCookie(e.target.value)}
                  rows={4}
                  className="w-full min-w-0 break-all font-mono text-xs"
                  disabled={isViewer}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="user-agent">
                  User-Agent{" "}
                  <span className="text-muted-foreground">
                    (optional, leave blank for default)
                  </span>
                </Label>
                <Input
                  id="user-agent"
                  placeholder={
                    active.hasUserAgent
                      ? "A custom user-agent is set. Type to replace it."
                      : "Defaults to Instagram Android UA"
                  }
                  value={userAgent}
                  onChange={(e) => setUserAgent(e.target.value)}
                  className="font-mono text-xs"
                  disabled={isViewer}
                />
              </div>

              <Button onClick={handleSave} disabled={disabled}>
                {update.isPending ? "Saving..." : "Save profile"}
              </Button>
            </CardContent>
          </Card>

          <Separator />

          <CloudinarySettings />
        </div>
      )}
    </div>
  );
}
