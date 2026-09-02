"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { proxyImageUrl } from "@/lib/proxy-image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Account } from "@/types";

interface TopAccountsProps {
  accounts: Account[];
}

export function TopAccounts({ accounts }: TopAccountsProps) {
  if (accounts.length === 0) {
    return null;
  }

  return (
    <Card className="hover:border-hairline-strong transition-all">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold">Top Creators</CardTitle>
        <Link
          href="/accounts"
          className="text-xs font-semibold text-primary hover:text-amber-400 flex items-center gap-0.5 transition-colors uppercase tracking-wider"
        >
          View all <ChevronRight className="size-3" />
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {accounts.map((account) => (
            <Link
              key={account.pk}
              href={`/accounts/${account.username}`}
              className="flex items-center gap-3 rounded-[6px] p-2 transition-all bg-surface-1/40 hover:bg-surface-2 border border-hairline/40 hover:border-hairline group"
            >
              <Avatar className="size-9 rounded-[4px] border border-hairline">
                <AvatarImage
                  src={proxyImageUrl(
                    account.cloudinaryProfilePicUrl ?? account.profilePicUrl
                  )}
                  className="object-cover"
                />
                <AvatarFallback className="rounded-[4px] text-xs font-semibold bg-surface-3 text-ink">
                  {account.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-ink group-hover:text-primary transition-colors truncate">
                    @{account.username}
                  </p>
                  {account.isVerified && (
                    <Badge variant="default" className="text-[9px] px-1 py-0 h-4 bg-amber-500/10 text-amber-500 border border-amber-500/20 font-mono">
                      Verified
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-ink-muted truncate">
                  {account.fullName || "No full name"}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0 bg-surface-2 px-2 py-1 rounded-[4px] border border-hairline">
                <span className="text-xs font-mono font-bold text-ink">
                  {account.savedPostCount}
                </span>
                <span className="text-[10px] text-ink-muted uppercase">posts</span>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
