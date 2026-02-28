"use client";

import { AccountCard } from "./account-card";
import type { Account } from "@/types";

interface AccountsGridProps {
  accounts: Account[];
}

export function AccountsGrid({ accounts }: AccountsGridProps) {
  if (accounts.length === 0) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        No accounts found.
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {accounts.map((account) => (
        <AccountCard key={account.pk} account={account} />
      ))}
    </div>
  );
}
