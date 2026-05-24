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
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pages Scraped</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pagesScraped}</div>
          <p className="text-xs text-muted-foreground">
            {pagesScraped * 48} max posts checked
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Posts Found</CardTitle>
          <Search className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalPostsFound}</div>
          <p className="text-xs text-muted-foreground">total from Instagram</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">New Posts</CardTitle>
          <Plus className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{newPostsAdded}</div>
          <p className="text-xs text-muted-foreground">
            {totalPostsFound > 0
              ? `${Math.round((newPostsAdded / totalPostsFound) * 100)}% were new`
              : "added this run"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">New Accounts</CardTitle>
          <UserPlus className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{newAccountsFound}</div>
          <p className="text-xs text-muted-foreground">first time seen</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Newly Lost</CardTitle>
          <UserX className={cn("h-4 w-4", newlyLostAccountsCount > 0 ? "text-destructive" : "text-muted-foreground")} />
        </CardHeader>
        <CardContent>
          <div className={cn("text-2xl font-bold", newlyLostAccountsCount > 0 && "text-destructive")}>
            {newlyLostAccountsCount}
          </div>
          <p className="text-xs text-muted-foreground">missing this run</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Newly Recovered</CardTitle>
          <UserCheck className={cn("h-4 w-4", newlyRecoveredAccountsCount > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")} />
        </CardHeader>
        <CardContent>
          <div className={cn("text-2xl font-bold", newlyRecoveredAccountsCount > 0 && "text-emerald-600 dark:text-emerald-400")}>
            {newlyRecoveredAccountsCount}
          </div>
          <p className="text-xs text-muted-foreground">reappeared this run</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">All Lost</CardTitle>
          <UserMinus className={cn("h-4 w-4", lostAccountsCount > 0 ? "text-destructive" : "text-muted-foreground")} />
        </CardHeader>
        <CardContent>
          <div className={cn("text-2xl font-bold", lostAccountsCount > 0 && "text-destructive")}>
            {lostAccountsCount}
          </div>
          <p className="text-xs text-muted-foreground">cumulative total</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Renamed</CardTitle>
          <UserRoundPen className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{usernameChangesCount}</div>
          <p className="text-xs text-muted-foreground">username changes</p>
        </CardContent>
      </Card>
    </div>
  );
}
