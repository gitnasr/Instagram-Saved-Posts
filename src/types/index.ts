import type {
  Account as PrismaAccount,
  AccountNote as PrismaAccountNote,
  AccountStatusHistory as PrismaAccountStatusHistory,
  AccountUsernameHistory as PrismaAccountUsernameHistory,
  AccountEvent as PrismaAccountEvent,
  Post as PrismaPost,
  ScrapeRun as PrismaScrapeRun,
  Setting as PrismaSetting,
  CarouselMedia as PrismaCarouselMedia,
} from "@prisma/client";

/** Profile data exposed to the client (no cookie/user-agent secrets). */
export interface ProfilePublic {
  id: string;
  name: string;
  avatarUrl: string | null;
  avatarColor: string | null;
  igUsername: string | null;
  hasCookie: boolean;
  hasUserAgent: boolean;
  createdAt: string;
  isActive: boolean;
}

export type Account = PrismaAccount;
export type AccountNote = PrismaAccountNote;
export type AccountStatusHistory = PrismaAccountStatusHistory;
export type AccountUsernameHistory = PrismaAccountUsernameHistory;
export type AccountEvent = PrismaAccountEvent;
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
  events: AccountEvent[];
  /** Cap applied to `events`; a full page means older entries were trimmed. */
  eventsLimit: number;
  /** Unix seconds of the newest saved post, or null when none. */
  latestPostTakenAt: number | null;
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
  newlyLostAccounts: Account[];
  newlyRecoveredAccounts: Account[];
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

export interface VectorSearchHit {
  post: Post;
  score: number;
  /** Only present for search-by-face results — the matched face's location in the post's image. */
  bbox?: { x: number; y: number; width: number; height: number };
}

export interface VectorIndexProgress {
  status: "running" | "completed" | "failed";
  totalItems: number;
  indexedItems: number;
  facesIndexed: number;
  failedItems: number;
  errorMessage?: string;
}

export interface ScrapeStatusResponse {
  current: {
    runId: number;
    profileId: string;
    status: "running" | "completed" | "failed" | "cancelled" | "interrupted";
    pagesScraped: number;
    totalPostsFound: number;
    newPostsAdded: number;
    newAccountsFound: number;
  } | null;
  history: ScrapeRun[];
}
