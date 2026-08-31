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
