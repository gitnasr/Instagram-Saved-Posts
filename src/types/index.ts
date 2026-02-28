import type { accounts, posts, scrapeRuns, settings } from "@/db/schema";
import type { InferSelectModel } from "drizzle-orm";

export type Account = InferSelectModel<typeof accounts>;
export type Post = InferSelectModel<typeof posts>;
export type ScrapeRun = InferSelectModel<typeof scrapeRuns>;
export type Setting = InferSelectModel<typeof settings>;

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AccountDetailResponse {
  account: Account;
  posts: Post[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ScrapeTrendPoint {
  id: number;
  startedAt: string;
  totalPostsFound: number;
  newPostsAdded: number;
  newAccountsFound: number;
  status: string;
}

export interface AccountBreakdown {
  total: number;
  verified: number;
  private: number;
  public: number;
}

export interface RunDetailResponse {
  run: ScrapeRun;
  newPosts: Post[];
  newAccounts: Account[];
}

export interface AnalyticsResponse {
  totalAccounts: number;
  totalPosts: number;
  lastScrape: ScrapeRun | null;
  topAccounts: Account[];
  recentScrapes: ScrapeRun[];
  mediaTypeBreakdown: { mediaType: number; count: number }[];
  scrapesTrend: ScrapeTrendPoint[];
  accountBreakdown: AccountBreakdown;
}

export interface ScrapeStatusResponse {
  current: {
    runId: number;
    status: "running" | "completed" | "failed" | "cancelled";
    pagesScraped: number;
    totalPostsFound: number;
    newPostsAdded: number;
    newAccountsFound: number;
  } | null;
  history: ScrapeRun[];
}
