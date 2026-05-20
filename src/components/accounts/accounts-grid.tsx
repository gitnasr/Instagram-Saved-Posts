"use client";

import { AccountCard } from "./account-card";
import type { Account } from "@/types";

interface AccountsGridProps {
  accounts: Account[];
}

export function AccountsGrid({ accounts }: AccountsGridProps) {
  if (accounts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed px-4 py-12 text-center">
        <p className="font-medium">No accounts found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Try changing the search or filters.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {accounts.map((account) => (
        <AccountCard key={account.pk} account={account} />
      ))}
    </div>
  );
}
