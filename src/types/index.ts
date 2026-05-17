import type {
  accounts,
  accountNotes,
  accountStatusHistory,
  accountUsernameHistory,
  posts,
  scrapeRuns,
  settings,
  carouselMedia,
} from "@/db/schema";
import type { InferSelectModel } from "drizzle-orm";

export type Account = InferSelectModel<typeof accounts>;
export type AccountNote = InferSelectModel<typeof accountNotes>;
export type AccountStatusHistory = InferSelectModel<typeof accountStatusHistory>;
export type AccountUsernameHistory = InferSelectModel<typeof accountUsernameHistory>;
export type Post = InferSelectModel<typeof posts>;
export type ScrapeRun = InferSelectModel<typeof scrapeRuns>;
export type Setting = InferSelectModel<typeof settings>;
export type CarouselMediaItem = InferSelectModel<typeof carouselMedia>;

export interface PostWithCarousel extends Post {
  carouselItems?: CarouselMediaItem[];
}

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
  existsAlsoOptions: string[];
  statusHistory: AccountStatusHistory[];
  usernameHistory: AccountUsernameHistory[];
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
  lostAccounts: Account[];
  usernameChanges: Array<AccountUsernameHistory & { account: Account }>;
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

export interface CloudinarySyncProgress {
  status: "running" | "completed" | "failed";
  totalAccounts: number;
  totalPosts: number;
  totalCarouselItems: number;
  uploadedAccounts: number;
  uploadedPosts: number;
  uploadedCarouselItems: number;
  failedUploads: number;
  errorMessage?: string;
}

export interface ScrapeStatusResponse {
  current: {
    runId: number;
    status: "running" | "completed" | "failed" | "cancelled" | "interrupted";
    pagesScraped: number;
    totalPostsFound: number;
    newPostsAdded: number;
    newAccountsFound: number;
  } | null;
  history: ScrapeRun[];
}
