"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { ProfileAvatar } from "./profile-avatar";
import { ProfileFormDialog } from "./profile-form-dialog";
import { Button } from "@/components/ui/button";
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
    <div className="flex min-h-dvh flex-col items-center justify-center gap-10 p-6">
      <h1 className="text-3xl font-semibold sm:text-4xl">Who&apos;s tracking?</h1>

      {isLoading ? (
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      ) : (
        <div className="flex max-w-3xl flex-wrap items-start justify-center gap-6">
          {profiles?.map((p) => (
            <div
              key={p.id}
              className="group flex w-28 flex-col items-center gap-3"
            >
              <button
                onClick={() => handleSelect(p)}
                disabled={selectingId !== null}
                className="relative rounded-xl outline-none ring-offset-4 ring-offset-background transition focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
                aria-label={`Use profile ${p.name}`}
              >
                <ProfileAvatar
                  name={p.name}
                  avatarUrl={p.avatarUrl}
                  avatarColor={p.avatarColor}
                  className="size-28 rounded-xl border-2 border-transparent transition group-hover:border-primary"
                  fallbackClassName="rounded-xl text-3xl"
                />
                {selectingId === p.id && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/60">
                    <Loader2 className="size-6 animate-spin" />
                  </div>
                )}
              </button>
              <span className="max-w-full truncate text-sm font-medium text-muted-foreground">
                {p.name}
              </span>

              {manage && (
                <div className="flex gap-1">
                  <ProfileFormDialog
                    profile={p}
                    trigger={
                      <Button
                        size="icon"
                        variant="outline"
                        className="size-8"
                        aria-label={`Edit profile ${p.name}`}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    }
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    className="size-8 text-destructive"
                    onClick={() => handleDelete(p)}
                    disabled={del.isPending}
                    aria-label={`Delete profile ${p.name}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}

          <ProfileFormDialog
            trigger={
              <button
                className="flex w-28 flex-col items-center gap-3"
                aria-label="Add profile"
              >
                <span className="flex size-28 items-center justify-center rounded-xl border-2 border-dashed text-muted-foreground transition hover:border-primary hover:text-primary">
                  <Plus className="size-10" />
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  Add profile
                </span>
              </button>
            }
          />
        </div>
      )}

      {profiles && profiles.length > 0 && (
        <Button variant="ghost" onClick={() => setManage((m) => !m)}>
          {manage ? "Done" : "Manage profiles"}
        </Button>
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
