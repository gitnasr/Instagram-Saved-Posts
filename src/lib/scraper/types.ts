/**
 * Shared shapes for the scraper modules.
 *
 * `Runtime` is exported so sibling modules can type against it, but it is
 * deliberately absent from `index.ts` — only `ScrapeProgress` is public.
 */

export interface ScrapeProgress {
  runId: number;
  profileId: string;
  status: "running" | "completed" | "failed" | "cancelled" | "interrupted";
  pagesScraped: number;
  totalPostsFound: number;
  newPostsAdded: number;
  newAccountsFound: number;
}

/** In-memory per-profile scrape runtime (reset each run). */
export interface Runtime {
  state: ScrapeProgress;
  usernameChanges: Set<string>;
  /**
   * Profile-pic hashes already computed this run, keyed by account pk. An
   * account with 40 saved posts used to cost 40 CDN downloads; now it costs
   * one. Deliberately per-run, so a resumed segment re-verifies.
   */
  profilePicHashCache: Map<string, string | null>;
  /** Set by `requestScrapeCancel`; checked between pages. */
  cancelRequested: boolean;
  retryCount: number;
}

/**
 * The slice of runtime a per-item sync helper may touch. Passing this instead
 * of the whole `Runtime` keeps the persistence modules free of run state —
 * they report what changed and let the caller update the counters.
 */
export interface MediaItemContext {
  runId: number;
  profileId: string;
  profilePicHashCache: Map<string, string | null>;
}

/** Account lost/recovered partition produced at the end of a completed run. */
export interface LostState {
  allLostPks: string[];
  newlyLostPks: string[];
  newlyRecoveredPks: string[];
}
