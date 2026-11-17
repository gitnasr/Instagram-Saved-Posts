"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { proxyImageUrl } from "@/lib/proxy-image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { AccountFlags } from "@/components/accounts/account-flags";
import { ProfileLink } from "@/components/accounts/profile-link";
import type { Account } from "@/types";

interface TopAccountsProps {
  accounts: Account[];
}

export function TopAccounts({ accounts }: TopAccountsProps) {
  if (accounts.length === 0) {
    return null;
  }

  return (
    <Card className="gap-2 py-4">
      <CardHeader className="flex flex-row items-center justify-between px-4">
        <CardTitle className="text-sm font-semibold">Top creators</CardTitle>
        <Link
          href="/accounts"
          className="flex items-center gap-0.5 text-xs text-ink-muted transition-colors hover:text-foreground"
        >
          View all <ChevronRight className="size-3" />
        </Link>
      </CardHeader>
      <CardContent className="px-2">
        <div className="divide-y divide-hairline/60">
          {accounts.map((account) => (
            <ProfileLink
              key={account.pk}
              username={account.username}
              className="group flex items-center gap-3 rounded-sm px-2 py-2 transition-colors hover:bg-surface-2"
            >
              <Avatar className="size-8 rounded-sm">
                <AvatarImage
                  src={proxyImageUrl(
                    account.cloudinaryProfilePicUrl ?? account.profilePicUrl
                  )}
                  className="object-cover"
                />
                <AvatarFallback className="rounded-sm bg-surface-3 text-xs font-semibold text-ink">
                  {account.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 truncate text-sm font-medium text-ink">
                  @{account.username}
                  <AccountFlags account={account} />
                </p>
                <p className="truncate text-xs text-ink-muted">
                  {account.fullName || "No full name"}
                </p>
              </div>
              <span className="shrink-0 font-mono text-sm font-semibold text-ink">
                {account.savedPostCount}
              </span>
            </ProfileLink>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
