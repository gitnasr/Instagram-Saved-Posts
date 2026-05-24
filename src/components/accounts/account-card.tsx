"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { proxyImageUrl } from "@/lib/proxy-image";
import type { Account } from "@/types";

interface AccountCardProps {
  account: Account;
}

export function AccountCard({ account }: AccountCardProps) {
  return (
    <Link
      href={`/accounts/${account.username}`}
      aria-label={`Open @${account.username}`}
      className="block"
    >
      <Card className="rounded-lg py-0 transition-colors hover:bg-accent/50">
        <CardContent className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
          <Avatar className="size-12">
            <AvatarImage src={proxyImageUrl(account.cloudinaryProfilePicUrl ?? account.profilePicUrl)} />
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
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {account.fullName}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-lg font-bold">{account.savedPostCount}</p>
            <p className="text-xs text-muted-foreground">posts</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
