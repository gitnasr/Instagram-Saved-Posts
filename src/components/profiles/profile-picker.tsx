"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Loader2, UserCheck } from "lucide-react";
import { ProfileAvatar } from "./profile-avatar";
import { ProfileFormDialog } from "./profile-form-dialog";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/layout/brand-logo";
import {
  useProfiles,
  useSelectProfile,
  useDeleteProfile,
} from "@/hooks/use-profiles";
import { toast } from "sonner";
import type { ProfilePublic } from "@/types";

export function ProfilePicker() {
  const { data: profiles, isLoading } = useProfiles();
  const select = useSelectProfile();
  const del = useDeleteProfile();
  const [manage, setManage] = useState(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);

  const handleSelect = (p: ProfilePublic) => {
    if (manage || selectingId) return;
    setSelectingId(p.id);
    select.mutate(p.id, {
      // Full reload so the httpOnly active-profile cookie is applied server-side.
      onSuccess: () => window.location.assign("/"),
      onError: (e) => {
        toast.error(e.message);
        setSelectingId(null);
      },
    });
  };

  const handleDelete = (p: ProfilePublic) => {
    if (
      !window.confirm(
        `Delete profile "${p.name}" and all of its data? This cannot be undone.`
      )
    ) {
      return;
    }
    del.mutate(p.id, {
      onSuccess: () => toast.success(`Deleted ${p.name}`),
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-10 p-6 bg-canvas text-ink relative overflow-hidden">
      {/* Background dot matrix */}
      <div className="absolute inset-0 dot-grid opacity-25 pointer-events-none" />

      {/* Brand logo header */}
      <div className="relative z-10 flex flex-col items-center gap-3">
        <BrandLogo size={36} showText={false} />
        <h1 className="text-3xl font-medium text-ink sm:text-4xl">
          Who&apos;s tracking?
        </h1>
        <p className="text-sm text-ink-muted font-mono">
          Select an active profile workspace to continue
        </p>
      </div>

      {isLoading ? (
        <div className="relative z-10 flex items-center gap-2 text-sm font-mono text-ink-muted">
          <Loader2 className="size-5 animate-spin text-highlight" />
          Loading profiles...
        </div>
      ) : (
        <div className="relative z-10 flex max-w-3xl flex-wrap items-start justify-center gap-8">
          {profiles?.map((p) => (
            <div
              key={p.id}
              className="group flex w-32 flex-col items-center gap-3"
            >
              <button
                onClick={() => handleSelect(p)}
                disabled={selectingId !== null}
                className="relative rounded-md transition-colors disabled:opacity-60 cursor-pointer"
                aria-label={`Use profile ${p.name}`}
              >
                <ProfileAvatar
                  name={p.name}
                  avatarUrl={p.avatarUrl}
                  avatarColor={p.avatarColor}
                  className="size-28 rounded-md border-2 border-hairline transition-colors group-hover:border-primary"
                  fallbackClassName="rounded-md text-3xl font-medium font-mono"
                />
                {p.isActive && (
                  <div className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-primary text-primary-foreground">
                    <UserCheck className="size-3.5" />
                  </div>
                )}
                {selectingId === p.id && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/70 backdrop-blur-xs">
                    <Loader2 className="size-7 animate-spin text-highlight" />
                  </div>
                )}
              </button>
              <span className="max-w-full truncate text-sm font-medium text-ink group-hover:text-highlight transition-colors">
                {p.name}
              </span>

              {manage && (
                <div className="flex gap-1.5">
                  <ProfileFormDialog
                    profile={p}
                    trigger={
                      <Button
                        size="icon"
                        variant="outline"
                        aria-label={`Edit profile ${p.name}`}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    }
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    className="rounded-sm border-hairline text-danger hover:bg-danger/10"
                    onClick={() => handleDelete(p)}
                    disabled={del.isPending}
                    aria-label={`Delete profile ${p.name}`}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              )}
            </div>
          ))}

          <ProfileFormDialog
            trigger={
              <button
                className="flex w-32 flex-col items-center gap-3 group cursor-pointer"
                aria-label="Add profile"
              >
                <span className="flex size-28 items-center justify-center rounded-md border-2 border-dashed border-hairline-strong text-ink-subtle transition-colors group-hover:border-primary group-hover:text-highlight bg-surface-1/40">
                  <Plus className="size-8" />
                </span>
                <span className="text-sm font-medium text-ink-muted group-hover:text-ink transition-colors">
                  Add profile
                </span>
              </button>
            }
          />
        </div>
      )}

      {profiles && profiles.length > 0 && (
        <div className="relative z-10">
          <Button
            variant="outline"
            className="text-xs font-mono border-hairline text-ink-muted hover:text-ink"
            onClick={() => setManage((m) => !m)}
          >
            {manage ? "Done Managing" : "Manage Profiles"}
          </Button>
        </div>
      )}

      <div className="text-center text-xs text-muted-foreground">
        by{" "}
        <a
          href="https://gitnasr.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-foreground hover:underline transition-colors"
        >
          gitnasr.com
        </a>{" "}
        softwares
      </div>
    </div>
  );
}
