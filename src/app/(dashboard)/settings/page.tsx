"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CloudinarySettings } from "@/components/settings/cloudinary-settings";
import { NavigationSettings } from "@/components/settings/navigation-settings";
import { SettingsSection } from "@/components/settings/settings-section";
import { UpdatesSettings } from "@/components/settings/updates-settings";
import { useProfiles, useUpdateProfile } from "@/hooks/use-profiles";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { User, Save } from "lucide-react";

const SECTIONS = [
  { id: "profile", label: "Profile" },
  { id: "navigation", label: "Navigation" },
  { id: "cloudinary", label: "Cloudinary" },
  { id: "updates", label: "Updates" },
];

/** Open the target section (they are <details>) and bring it into view. */
function jumpTo(id: string) {
  const section = document.getElementById(id);
  const details = section?.querySelector("details");
  if (details) details.open = true;
  section?.scrollIntoView({ behavior: "smooth", block: "start" });
}

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
    <div className="space-y-5">
      <Header
        title="Settings"
        description="Profile credentials, navigation, storage and updates."
      />

      {isLoading || !active ? (
        <div className="space-y-3">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-14 w-full rounded-lg" />
          <Skeleton className="h-14 w-full rounded-lg" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[9rem_minmax(0,1fr)]">
          <nav aria-label="Settings sections" className="hidden lg:block">
            <ul className="sticky top-6 space-y-0.5">
              {SECTIONS.map(({ id, label }) => (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => jumpTo(id)}
                    className="w-full rounded-sm px-2 py-1.5 text-left text-sm text-ink-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="space-y-3">
            <SettingsSection
              id="profile"
              title={`Profile: ${active.name}`}
              description="Session used to fetch your saved posts"
              icon={User}
              status={
                <span className="hidden text-xs text-ink-muted sm:inline">
                  {active.hasCookie ? "Cookie set" : "No cookie"}
                </span>
              }
              defaultOpen
            >
              <div className="space-y-2">
                <Label htmlFor="profile-name" className="text-xs text-ink-muted">
                  Profile name
                </Label>
                <Input
                  id="profile-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isViewer}
                  required
                  autoComplete="off"
                  className="max-w-md text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cookie" className="text-xs text-ink-muted">
                  Instagram session cookie
                </Label>
                <p className="text-xs leading-relaxed text-ink-subtle">
                  {active.hasCookie
                    ? "A session cookie is configured. Paste a new cookie string below to update it."
                    : "No cookie configured yet. Scraping needs an authenticated Instagram session cookie."}
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
                  className="w-full min-w-0 break-all bg-surface-2/40 font-mono text-xs"
                  disabled={isViewer}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="user-agent" className="text-xs text-ink-muted">
                  Custom User-Agent <span className="text-ink-subtle">(optional)</span>
                </Label>
                <Input
                  id="user-agent"
                  placeholder={
                    active.hasUserAgent
                      ? "A custom user-agent is configured. Type to replace."
                      : "Defaults to a desktop Chrome User-Agent"
                  }
                  value={userAgent}
                  onChange={(e) => setUserAgent(e.target.value)}
                  className="max-w-2xl bg-surface-2/40 font-mono text-xs"
                  disabled={isViewer}
                />
              </div>

              <Button onClick={handleSave} disabled={disabled} className="text-xs font-semibold">
                <Save className="mr-1.5 size-3.5" />
                {update.isPending ? "Saving…" : "Save profile"}
              </Button>
            </SettingsSection>

            <NavigationSettings />
            <CloudinarySettings />
            <UpdatesSettings />
          </div>
        </div>
      )}
    </div>
  );
}
