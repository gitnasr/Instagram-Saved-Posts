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
  /** When provided, the dialog edits this profile; otherwise it creates a new one. */
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

  // Reset the form each time the dialog transitions to open (render-time sync,
  // avoids a setState-in-effect cascade).
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit profile" : "Add profile"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this profile's name or paste a fresh cookie."
              : "Give the profile a name and paste its Instagram cookie."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile-name">Name</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sama"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-cookie">
              Instagram cookie{" "}
              {isEdit && (
                <span className="text-muted-foreground">
                  (leave blank to keep current)
                </span>
              )}
            </Label>
            <Textarea
              id="profile-cookie"
              value={cookie}
              onChange={(e) => setCookie(e.target.value)}
              rows={4}
              className="font-mono text-xs"
              placeholder="Paste cookie string..."
            />
            {isEdit && profile?.hasCookie && (
              <p className="text-xs text-muted-foreground">
                A cookie is already set for this profile.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-ua">
              User-Agent <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="profile-ua"
              value={userAgent}
              onChange={(e) => setUserAgent(e.target.value)}
              className="font-mono text-xs"
              placeholder="Defaults to Instagram Android UA"
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={pending}>
            {pending
              ? "Saving..."
              : isEdit
                ? "Save changes"
                : "Create profile"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
