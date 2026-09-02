"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { proxyImageUrl } from "@/lib/proxy-image";
import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";
import type { Account } from "@/types";

interface AccountCardProps {
  account: Account;
  selected?: boolean;
  onToggleSelect?: (account: Account) => void;
  onToggleIgnore?: (account: Account) => void;
}

export function AccountCard({
  account,
  selected = false,
  onToggleSelect,
  onToggleIgnore,
}: AccountCardProps) {
  const isIgnored = account.ignoredAt != null;

  return (
    <Card
      className={cn(
        "relative rounded-[8px] py-0 transition-all border border-hairline bg-surface-1 hover:bg-surface-2 hover:border-hairline-strong",
        isIgnored && "opacity-50",
        selected && "border-primary ring-1 ring-primary/40 bg-surface-2"
      )}
    >
      <Link
        href={`/accounts/${account.username}`}
        aria-label={`Open @${account.username}`}
        className="absolute inset-0 z-0 rounded-[8px]"
      />

      <CardContent className="pointer-events-none relative z-10 flex items-center gap-3 p-3 sm:gap-3.5 sm:p-3.5">
        {onToggleSelect && (
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggleSelect(account)}
            aria-label={`Select @${account.username}`}
            className="pointer-events-auto shrink-0 border-hairline-strong data-[state=checked]:bg-primary data-[state=checked]:text-black"
          />
        )}

        <Avatar className="size-11 rounded-[6px] border border-hairline">
          <AvatarImage
            src={proxyImageUrl(
              account.cloudinaryProfilePicUrl ?? account.profilePicUrl
            )}
            className="object-cover"
          />
          <AvatarFallback className="rounded-[6px] text-xs font-semibold bg-surface-3 text-ink">
            {account.username.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex min-w-0 items-center gap-1.5 flex-wrap">
            <p className="font-semibold text-sm text-ink truncate">@{account.username}</p>
            {account.isVerified && (
              <Badge variant="default" className="text-[9px] px-1 py-0 h-4 bg-amber-500/10 text-amber-500 border border-amber-500/20 font-mono">
                Verified
              </Badge>
            )}
            {account.isPrivate && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-hairline text-ink-muted">
                Private
              </Badge>
            )}
            {account.lostAt && (
              <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">
                Lost
              </Badge>
            )}
            {isIgnored && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-hairline text-ink-subtle">
                Ignored
              </Badge>
            )}
          </div>
          <p className="text-xs text-ink-muted truncate mt-0.5">
            {account.fullName || "No full name"}
          </p>
        </div>

        <div className="shrink-0 text-right pr-1">
          <p className="text-base font-bold font-mono text-ink leading-tight">{account.savedPostCount}</p>
          <p className="text-[10px] uppercase font-mono text-ink-subtle">posts</p>
        </div>

        {onToggleIgnore && (
          <Button
            variant="ghost"
            size="icon-xs"
            className="pointer-events-auto shrink-0 text-ink-muted hover:text-ink hover:bg-surface-3"
            aria-label={
              isIgnored
                ? `Un-ignore @${account.username}`
                : `Ignore @${account.username}`
            }
            title={
              isIgnored
                ? "Un-ignore — include in CSV export again"
                : "Ignore — exclude from CSV export"
            }
            onClick={() => onToggleIgnore(account)}
          >
            {isIgnored ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
