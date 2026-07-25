"use client";

import { useState, use } from "react";
import { Header } from "@/components/layout/header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountMetadata } from "@/components/accounts/account-metadata";
import { AccountTimeline } from "@/components/accounts/account-timeline";
import { AccountPostsGrid } from "@/components/accounts/account-posts-grid";
import { AccountNotes } from "@/components/accounts/account-notes";
import { useAccountDetail } from "@/hooks/use-account-detail";
import { proxyImageUrl } from "@/lib/proxy-image";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

export default function AccountDetailPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAccountDetail(username, page);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Account not found.
      </div>
    );
  }

  const { account, posts, pagination } = data;
  const igProfileUrl = `https://www.instagram.com/${account.username}/`;
  const avatarSrc = proxyImageUrl(account.cloudinaryProfilePicUrl ?? account.profilePicUrl);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/accounts" className="hover:text-foreground">
          Accounts
        </Link>
        <span>/</span>
        <span>@{account.username}</span>
      </div>

      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={avatarSrc} />
          <AvatarFallback className="text-lg">
            {account.username.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">@{account.username}</h2>
            {account.isVerified && <Badge variant="secondary">Verified</Badge>}
            {account.isPrivate && <Badge variant="outline">Private</Badge>}
            {account.lostAt && <Badge variant="destructive">Lost</Badge>}
            {account.ignoredAt && <Badge variant="outline">Ignored</Badge>}
          </div>
          <p className="text-muted-foreground">{account.fullName}</p>
          <p className="text-sm text-muted-foreground">
            {account.savedPostCount} saved posts
            {data.latestPostTakenAt
              ? ` · latest ${format(new Date(data.latestPostTakenAt * 1000), "MMM d, yyyy")}`
              : ""}
          </p>
          {account.lostAt ? (
            <p className="text-sm text-destructive">
              Lost on {format(new Date(account.lostAt), "MMM d, yyyy")}
            </p>
          ) : account.recoveredAt ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              Recovered on {format(new Date(account.recoveredAt), "MMM d, yyyy")}
            </p>
          ) : null}
        </div>
        <Button asChild variant="outline" size="sm">
          <a href={igProfileUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            Profile
          </a>
        </Button>
      </div>

      <AccountMetadata
        key={[
          account.username,
          account.lastScrapeOn ?? "",
          account.accountStatus ?? "",
          account.statusChangedAt ?? "",
          account.existsAlso ?? "",
          account.lostAt ?? "",
          account.recoveredAt ?? "",
          account.ignoredAt ?? "",
          data.existsAlsoOptions.join("|"),
        ].join("::")}
        account={account}
        existsAlsoOptions={data.existsAlsoOptions}
      />

      <AccountTimeline events={data.events} eventsLimit={data.eventsLimit} />

      <AccountNotes username={account.username} />

      <Header title="Saved Posts" />

      <AccountPostsGrid posts={posts} />

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
