"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type { Account } from "@/types";

interface TopAccountsProps {
  accounts: Account[];
}

export function TopAccounts({ accounts }: TopAccountsProps) {
  if (accounts.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Accounts by Saved Posts</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {accounts.map((account) => (
            <Link
              key={account.pk}
              href={`/accounts/${account.username}`}
              className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent"
            >
              <Avatar className="h-9 w-9">
                <AvatarImage src={account.profilePicUrl ?? undefined} />
                <AvatarFallback>
                  {account.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium truncate">
                    @{account.username}
                  </p>
                  {account.isVerified && (
                    <Badge variant="secondary" className="text-xs px-1 py-0">
                      Verified
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {account.fullName}
                </p>
              </div>
              <span className="text-sm font-semibold">
                {account.savedPostCount}
              </span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
