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
    // The whole card is a link, so the checkbox and ignore button cannot be
    // nested inside it. Instead the link is a full-bleed layer underneath, and
    // only the interactive controls take pointer events back.
    <Card
      className={cn(
        "relative rounded-lg py-0 transition-colors hover:bg-accent/50",
        isIgnored && "opacity-60",
        selected && "ring-2 ring-primary"
      )}
    >
      <Link
        href={`/accounts/${account.username}`}
        aria-label={`Open @${account.username}`}
        className="absolute inset-0 z-0 rounded-lg"
      />

      <CardContent className="pointer-events-none relative z-10 flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
        {onToggleSelect && (
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggleSelect(account)}
            aria-label={`Select @${account.username}`}
            className="pointer-events-auto shrink-0"
          />
        )}

        <Avatar className="size-12">
          <AvatarImage
            src={proxyImageUrl(
              account.cloudinaryProfilePicUrl ?? account.profilePicUrl
            )}
          />
          <AvatarFallback>
            {account.username.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex min-w-0 items-center gap-1.5">
            <p className="font-medium truncate">@{account.username}</p>
            {account.isVerified && (
              <Badge variant="secondary" className="text-xs px-1 py-0">
                Verified
              </Badge>
            )}
            {account.isPrivate && (
              <Badge variant="outline" className="text-xs px-1 py-0">
                Private
              </Badge>
            )}
            {account.lostAt && (
              <Badge variant="destructive" className="text-xs px-1 py-0">
                Lost
              </Badge>
            )}
            {isIgnored && (
              <Badge variant="outline" className="text-xs px-1 py-0">
                Ignored
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {account.fullName}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-bold">{account.savedPostCount}</p>
          <p className="text-xs text-muted-foreground">posts</p>
        </div>

        {onToggleIgnore && (
          <Button
            variant="ghost"
            size="icon"
            className="pointer-events-auto shrink-0"
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
            {isIgnored ? <Eye /> : <EyeOff />}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
