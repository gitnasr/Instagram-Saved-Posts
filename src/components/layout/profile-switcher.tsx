"use client";

import Link from "next/link";
import { ChevronsUpDown, Plus, Check } from "lucide-react";
import { ProfileAvatar } from "@/components/profiles/profile-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProfiles, useSelectProfile } from "@/hooks/use-profiles";
import { toast } from "sonner";

export function ProfileSwitcher() {
  const { data: profiles } = useProfiles();
  const select = useSelectProfile();
  const active = profiles?.find((p) => p.isActive);

  const handleSwitch = (id: string) => {
    if (id === active?.id) return;
    select.mutate(id, {
      // Full reload so server components pick up the new active-profile cookie.
      onSuccess: () => window.location.assign("/"),
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left outline-none transition-colors hover:bg-accent">
        <ProfileAvatar
          name={active?.name ?? "?"}
          avatarUrl={active?.avatarUrl}
          avatarColor={active?.avatarColor}
          className="size-8"
        />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
          {active?.name ?? "Select profile"}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Profiles</DropdownMenuLabel>
        {profiles?.map((p) => (
          <DropdownMenuItem
            key={p.id}
            onClick={() => handleSwitch(p.id)}
            className="gap-2"
          >
            <ProfileAvatar
              name={p.name}
              avatarUrl={p.avatarUrl}
              avatarColor={p.avatarColor}
              className="size-6"
            />
            <span className="min-w-0 flex-1 truncate">{p.name}</span>
            {p.isActive && <Check className="size-4 shrink-0" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profiles" className="gap-2">
            <Plus className="size-4" /> Add / manage profiles
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
