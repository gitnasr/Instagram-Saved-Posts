"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useCreateProfile, useUpdateProfile } from "@/hooks/use-profiles";
import type { ProfilePublic } from "@/types";

interface ProfileFormDialogProps {
  profile?: ProfilePublic;
  trigger: React.ReactNode;
}

export function ProfileFormDialog({ profile, trigger }: ProfileFormDialogProps) {
  const isEdit = Boolean(profile);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(profile?.name ?? "");
  const [cookie, setCookie] = useState("");
  const [userAgent, setUserAgent] = useState("");

  const create = useCreateProfile();
  const update = useUpdateProfile();
  const pending = create.isPending || update.isPending;

  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName(profile?.name ?? "");
      setCookie("");
      setUserAgent("");
    }
  }

  const handleSubmit = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Name is required");
      return;
    }

    if (isEdit && profile) {
      update.mutate(
        {
          id: profile.id,
          name: trimmedName,
          ...(cookie.trim() ? { cookie: cookie.trim() } : {}),
          ...(userAgent.trim() ? { userAgent: userAgent.trim() } : {}),
        },
        {
          onSuccess: () => {
            toast.success("Profile updated");
            setOpen(false);
          },
          onError: (e) => toast.error(e.message),
        }
      );
    } else {
      create.mutate(
        {
          name: trimmedName,
          cookie: cookie.trim() || undefined,
          userAgent: userAgent.trim() || undefined,
        },
        {
          onSuccess: () => {
            toast.success("Profile created");
            setOpen(false);
          },
          onError: (e) => toast.error(e.message),
        }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md bg-surface-1 border border-hairline rounded-[8px] p-6">
        <DialogHeader className="pb-2 border-b border-hairline">
          <DialogTitle className="text-base font-semibold">
            {isEdit ? "Edit Profile" : "Create New Profile"}
          </DialogTitle>
          <DialogDescription className="text-xs text-ink-muted">
            {isEdit
              ? "Update profile details or refresh its Instagram session cookie."
              : "Define a new tracked account identity and session credentials."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="profile-name" className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
              Profile Name
            </Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My Account"
              className="text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-cookie" className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
              Instagram Cookie{" "}
              {isEdit && (
                <span className="text-ink-subtle text-[10px] font-normal">
                  (leave blank to retain current)
                </span>
              )}
            </Label>
            <Textarea
              id="profile-cookie"
              value={cookie}
              onChange={(e) => setCookie(e.target.value)}
              rows={4}
              className="w-full min-w-0 break-all font-mono text-xs bg-surface-2/40"
              placeholder="sessionid=...; ds_user_id=..."
            />
            {isEdit && profile?.hasCookie && (
              <p className="text-[11px] font-mono text-emerald-400">
                ✓ A session cookie is configured for this profile.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-ua" className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
              User-Agent <span className="text-ink-subtle text-[10px] font-normal font-mono">(optional)</span>
            </Label>
            <Input
              id="profile-ua"
              value={userAgent}
              onChange={(e) => setUserAgent(e.target.value)}
              className="font-mono text-xs bg-surface-2/40"
              placeholder="Defaults to Instagram Android UA"
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={pending} size="sm" className="text-xs font-semibold">
            {pending
              ? "Saving..."
              : isEdit
                ? "Save Changes"
                : "Create Profile"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
