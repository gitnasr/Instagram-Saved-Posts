"use client";

import { use } from "react";
import { AccountDetailView } from "@/components/accounts/account-detail-view";

export default function AccountDetailPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);
  return <AccountDetailView username={username} />;
}
