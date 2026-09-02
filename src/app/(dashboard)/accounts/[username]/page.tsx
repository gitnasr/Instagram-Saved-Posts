"use client";

import { useState, use } from "react";
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
import { ChevronLeft, ChevronRight, ExternalLink, ArrowLeft, BookmarkCheck, Calendar } from "lucide-react";
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
        <Skeleton className="h-28 w-full rounded-[8px]" />
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-[8px]" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-16 text-center text-ink-muted">
        <p className="text-base font-semibold">Account not found</p>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link href="/accounts">
            <ArrowLeft className="mr-1.5 size-3.5" /> Back to accounts
          </Link>
        </Button>
      </div>
    );
  }

  const { account, posts, pagination } = data;
  const igProfileUrl = `https://www.instagram.com/${account.username}/`;
  const avatarSrc = proxyImageUrl(account.cloudinaryProfilePicUrl ?? account.profilePicUrl);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-mono text-ink-muted">
        <Link href="/accounts" className="hover:text-primary transition-colors flex items-center gap-1">
          <ArrowLeft className="size-3" /> Accounts
        </Link>
        <span>/</span>
        <span className="text-ink font-semibold">@{account.username}</span>
      </div>

      {/* Account Hero Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-[8px] border border-hairline bg-surface-1">
        <div className="flex items-center gap-4">
          <Avatar className="size-16 rounded-[8px] border border-hairline">
            <AvatarImage src={avatarSrc} className="object-cover" />
            <AvatarFallback className="rounded-[8px] text-lg font-bold bg-surface-3 text-ink">
              {account.username.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight text-ink">@{account.username}</h1>
              {account.isVerified && (
                <Badge variant="default" className="text-[9px] px-1.5 py-0 h-4 bg-amber-500/10 text-amber-500 border border-amber-500/20 font-mono">
                  Verified
                </Badge>
              )}
              {account.isPrivate && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-hairline text-ink-muted">
                  Private
                </Badge>
              )}
              {account.lostAt && (
                <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4">
                  Lost
                </Badge>
              )}
              {account.ignoredAt && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-hairline text-ink-subtle">
                  Ignored
                </Badge>
              )}
            </div>
            <p className="text-xs text-ink-muted mt-0.5">{account.fullName || "No full display name"}</p>
            <div className="flex items-center gap-3 mt-2 text-xs font-mono text-ink-subtle">
              <span className="flex items-center gap-1 font-semibold text-ink">
                <BookmarkCheck className="size-3 text-amber-500" />
                {account.savedPostCount} saved posts
              </span>
              {data.latestPostTakenAt && (
                <span className="flex items-center gap-1">
                  <Calendar className="size-3" />
                  Latest {format(new Date(data.latestPostTakenAt * 1000), "MMM d, yyyy")}
                </span>
              )}
            </div>
          </div>
        </div>

        <Button asChild variant="outline" size="sm" className="self-start sm:self-center border-hairline hover:bg-surface-2 text-xs">
          <a href={igProfileUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-1.5 size-3.5" />
            Instagram Profile
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

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <AccountTimeline events={data.events} eventsLimit={data.eventsLimit} />
        <AccountNotes username={account.username} />
      </div>

      <div className="pt-4 border-t border-hairline">
        <div className="flex items-center justify-between pb-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-ink">Saved Posts Collection</h2>
            <p className="text-xs text-ink-muted">All preserved posts from @{account.username}</p>
          </div>
          <span className="text-xs font-mono text-ink-subtle">
            {posts.length} of {account.savedPostCount}
          </span>
        </div>

        <AccountPostsGrid posts={posts} />

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="text-xs"
            >
              <ChevronLeft className="size-3.5 mr-1" />
              Previous
            </Button>
            <span className="text-xs font-mono text-ink-muted px-2">
              Page {page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="text-xs"
            >
              Next
              <ChevronRight className="size-3.5 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
