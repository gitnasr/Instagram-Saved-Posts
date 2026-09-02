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
      <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-[6px] px-2.5 py-1.5 text-left outline-none transition-all bg-surface-1/60 hover:bg-surface-2 border border-hairline focus-visible:ring-2 focus-visible:ring-primary/20">
        <ProfileAvatar
          name={active?.name ?? "?"}
          avatarUrl={active?.avatarUrl}
          avatarColor={active?.avatarColor}
          className="size-7 rounded-[4px]"
        />
        <div className="flex flex-col min-w-0 flex-1 leading-tight">
          <span className="truncate text-xs font-semibold text-foreground">
            {active?.name ?? "Select profile"}
          </span>
          <span className="text-[10px] text-ink-muted">Active profile</span>
        </div>
        <ChevronsUpDown className="size-3.5 shrink-0 text-ink-subtle" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 bg-surface-1 border border-hairline shadow-xl">
        <DropdownMenuLabel className="text-xs uppercase tracking-wider text-ink-subtle font-semibold">
          Profiles
        </DropdownMenuLabel>
        {profiles?.map((p) => (
          <DropdownMenuItem
            key={p.id}
            onClick={() => handleSwitch(p.id)}
            className="gap-2.5 cursor-pointer py-1.5 hover:bg-surface-2 text-sm"
          >
            <ProfileAvatar
              name={p.name}
              avatarUrl={p.avatarUrl}
              avatarColor={p.avatarColor}
              className="size-6 rounded-[3px]"
            />
            <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
            {p.isActive && <Check className="size-3.5 shrink-0 text-primary" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="bg-hairline" />
        <DropdownMenuItem asChild>
          <Link href="/profiles" className="gap-2 text-xs font-medium text-primary hover:text-primary-hover cursor-pointer">
            <Plus className="size-3.5" /> Add / manage profiles
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
