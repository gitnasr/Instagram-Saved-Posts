export const DEFAULT_USER_AGENT =
  "Instagram 407.0.0.7.243 Android (28/9; 300dpi; 1600x900; google; G011A; G011A; intel; en_US; 825082503)";

export const INSTAGRAM_SAVED_POSTS_URL =
  "https://i.instagram.com/api/v1/feed/saved/posts/";

export const DEFAULT_PAGE_COUNT = 48;

export const SCRAPE_DELAY_MIN_MS = 2000;
export const SCRAPE_DELAY_MAX_MS = 4000;

/** Abort a single Instagram request after this long; a hung socket used to stall a whole run. */
export const SCRAPE_REQUEST_TIMEOUT_MS = 30_000;

/** Retries per page before a run is parked as resumable. */
export const SCRAPE_MAX_RETRIES = 5;
export const SCRAPE_RETRY_BASE_MS = 5_000;
export const SCRAPE_RETRY_MAX_MS = 300_000;

/**
 * Avatar bytes are fetched from the Instagram CDN only to hash them for
 * change detection. The CDN rejects the app user agent used for API calls,
 * so this browser one is sent instead.
 */
export const PROFILE_PIC_FETCH_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/** A hung avatar download must never stall the scrape loop. */
export const PROFILE_PIC_FETCH_TIMEOUT_MS = 5_000;

/** Current application version embedded at build time */
export const APP_VERSION =
  process.env.NEXT_PUBLIC_APP_VERSION || "1.0.1";

export const GITHUB_REPO_URL =
  "https://github.com/gitnasr/Instagram-Saved-Posts";

export const GITHUB_RELEASES_URL =
  `${GITHUB_REPO_URL}/releases`;

