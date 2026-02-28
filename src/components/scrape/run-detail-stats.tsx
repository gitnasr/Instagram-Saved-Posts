import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Search, Plus, UserPlus } from "lucide-react";

interface RunDetailStatsProps {
  pagesScraped: number;
  totalPostsFound: number;
  newPostsAdded: number;
  newAccountsFound: number;
}

export function RunDetailStats({
  pagesScraped,
  totalPostsFound,
  newPostsAdded,
  newAccountsFound,
}: RunDetailStatsProps) {
  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
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
    </div>
  );
}
