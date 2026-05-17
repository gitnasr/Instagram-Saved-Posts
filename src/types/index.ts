import type {
  Account as PrismaAccount,
  AccountNote as PrismaAccountNote,
  AccountStatusHistory as PrismaAccountStatusHistory,
  AccountUsernameHistory as PrismaAccountUsernameHistory,
  Post as PrismaPost,
  ScrapeRun as PrismaScrapeRun,
  Setting as PrismaSetting,
  CarouselMedia as PrismaCarouselMedia,
} from "@prisma/client";

export type Account = PrismaAccount;
export type AccountNote = PrismaAccountNote;
export type AccountStatusHistory = PrismaAccountStatusHistory;
export type AccountUsernameHistory = PrismaAccountUsernameHistory;
export type Post = PrismaPost;
export type ScrapeRun = PrismaScrapeRun;
export type Setting = PrismaSetting;
export type CarouselMediaItem = PrismaCarouselMedia;

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
