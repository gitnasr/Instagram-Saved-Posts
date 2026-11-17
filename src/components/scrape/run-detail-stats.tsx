import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileText,
  Search,
  Plus,
  UserPlus,
  UserMinus,
  UserX,
  UserCheck,
  UserRoundPen,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RunDetailStatsProps {
  pagesScraped: number;
  totalPostsFound: number;
  newPostsAdded: number;
  newAccountsFound: number;
  lostAccountsCount: number;
  newlyLostAccountsCount: number;
  newlyRecoveredAccountsCount: number;
  usernameChangesCount: number;
}

export function RunDetailStats({
  pagesScraped,
  totalPostsFound,
  newPostsAdded,
  newAccountsFound,
  lostAccountsCount,
  newlyLostAccountsCount,
  newlyRecoveredAccountsCount,
  usernameChangesCount,
}: RunDetailStatsProps) {
  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 xl:grid-cols-8">
      {/* Pages Scraped */}
      <Card className="rounded-md bg-surface-1 border-hairline hover:border-hairline-strong transition-colors py-3">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-4">
          <CardTitle className="text-eyebrow text-ink-subtle">Pages</CardTitle>
          <FileText className="size-3.5 text-ink-muted" />
        </CardHeader>
        <CardContent className="px-4">
          <div className="text-xl font-medium font-mono text-ink">{pagesScraped}</div>
          <p className="text-xs text-ink-subtle font-mono truncate">
            {pagesScraped * 48} checked
          </p>
        </CardContent>
      </Card>

      {/* Posts Found */}
      <Card className="rounded-md bg-surface-1 border-hairline hover:border-hairline-strong transition-colors py-3">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-4">
          <CardTitle className="text-eyebrow text-ink-subtle">Found</CardTitle>
          <Search className="size-3.5 text-ink-muted" />
        </CardHeader>
        <CardContent className="px-4">
          <div className="text-xl font-medium font-mono text-ink">{totalPostsFound}</div>
          <p className="text-xs text-ink-subtle font-mono truncate">from IG feed</p>
        </CardContent>
      </Card>

      {/* New Posts */}
      <Card className="rounded-md bg-surface-1 border-hairline hover:border-hairline-strong transition-colors py-3 border-primary/30">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-4">
          <CardTitle className="text-eyebrow text-highlight">New Posts</CardTitle>
          <Plus className="size-3.5 text-highlight" />
        </CardHeader>
        <CardContent className="px-4">
          <div className="text-xl font-medium font-mono text-highlight">+{newPostsAdded}</div>
          <p className="text-xs text-ink-subtle font-mono truncate">
            {totalPostsFound > 0
              ? `${Math.round((newPostsAdded / totalPostsFound) * 100)}% new`
              : "saved"}
          </p>
        </CardContent>
      </Card>

      {/* New Creators */}
      <Card className="rounded-md bg-surface-1 border-hairline hover:border-hairline-strong transition-colors py-3">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-4">
          <CardTitle className="text-eyebrow text-ink-subtle">Creators</CardTitle>
          <UserPlus className="size-3.5 text-ink-muted" />
        </CardHeader>
        <CardContent className="px-4">
          <div className="text-xl font-medium font-mono text-ink">+{newAccountsFound}</div>
          <p className="text-xs text-ink-subtle font-mono truncate">first seen</p>
        </CardContent>
      </Card>

      {/* Newly Lost */}
      <Card className="rounded-md bg-surface-1 border-hairline hover:border-hairline-strong transition-colors py-3">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-4">
          <CardTitle className="text-eyebrow text-ink-subtle">Newly Lost</CardTitle>
          <UserX className={cn("size-3.5", newlyLostAccountsCount > 0 ? "text-danger" : "text-ink-subtle")} />
        </CardHeader>
        <CardContent className="px-4">
          <div className={cn("text-xl font-medium font-mono", newlyLostAccountsCount > 0 ? "text-danger" : "text-ink")}>
            {newlyLostAccountsCount}
          </div>
          <p className="text-xs text-ink-subtle font-mono truncate">missing now</p>
        </CardContent>
      </Card>

      {/* Newly Recovered */}
      <Card className="rounded-md bg-surface-1 border-hairline hover:border-hairline-strong transition-colors py-3">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-4">
          <CardTitle className="text-eyebrow text-ink-subtle">Recovered</CardTitle>
          <UserCheck className={cn("size-3.5", newlyRecoveredAccountsCount > 0 ? "text-success" : "text-ink-subtle")} />
        </CardHeader>
        <CardContent className="px-4">
          <div className={cn("text-xl font-medium font-mono", newlyRecoveredAccountsCount > 0 ? "text-success" : "text-ink")}>
            {newlyRecoveredAccountsCount}
          </div>
          <p className="text-xs text-ink-subtle font-mono truncate">reappeared</p>
        </CardContent>
      </Card>

      {/* All Lost Total */}
      <Card className="rounded-md bg-surface-1 border-hairline hover:border-hairline-strong transition-colors py-3">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-4">
          <CardTitle className="text-eyebrow text-ink-subtle">All Lost</CardTitle>
          <UserMinus className={cn("size-3.5", lostAccountsCount > 0 ? "text-danger" : "text-ink-subtle")} />
        </CardHeader>
        <CardContent className="px-4">
          <div className={cn("text-xl font-medium font-mono", lostAccountsCount > 0 ? "text-danger" : "text-ink")}>
            {lostAccountsCount}
          </div>
          <p className="text-xs text-ink-subtle font-mono truncate">total missing</p>
        </CardContent>
      </Card>

      {/* Renamed */}
      <Card className="rounded-md bg-surface-1 border-hairline hover:border-hairline-strong transition-colors py-3">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-4">
          <CardTitle className="text-eyebrow text-ink-subtle">Renamed</CardTitle>
          <UserRoundPen className="size-3.5 text-ink-muted" />
        </CardHeader>
        <CardContent className="px-4">
          <div className="text-xl font-medium font-mono text-ink">{usernameChangesCount}</div>
          <p className="text-xs text-ink-subtle font-mono truncate">handle shifts</p>
        </CardContent>
      </Card>
    </div>
  );
}
