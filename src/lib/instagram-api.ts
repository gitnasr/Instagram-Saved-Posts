import type { InstagramSavedResponse } from "@/types/instagram";
import {
  DEFAULT_USER_AGENT,
  INSTAGRAM_SAVED_POSTS_URL,
  DEFAULT_PAGE_COUNT,
  SCRAPE_REQUEST_TIMEOUT_MS,
  SCRAPE_MAX_RETRIES,
  SCRAPE_RETRY_BASE_MS,
  SCRAPE_RETRY_MAX_MS,
} from "./constants";
import { logger } from "./logger";
import axios, { type AxiosError } from "axios";

/**
 * How a failed Instagram request should be treated.
 *
 * `rate_limited` and `transient` are retried and, once retries are spent,
 * leave the run resumable from its checkpoint. `auth` and `fatal` are not
 * retried — a dead cookie only gets worse if we keep hammering it.
 */
export type ScrapeErrorKind = "rate_limited" | "transient" | "auth" | "fatal";

/** Error carrying the verdict so the scraper can pick a run status from it. */
export class ScrapeRequestError extends Error {
  readonly kind: ScrapeErrorKind;
  readonly status?: number;
  readonly cause?: unknown;

  constructor(
    message: string,
    kind: ScrapeErrorKind,
    options: { status?: number; cause?: unknown } = {}
  ) {
    super(message);
    this.name = "ScrapeRequestError";
    this.kind = kind;
    this.status = options.status;
    this.cause = options.cause;
  }
}

function isAxiosError(e: unknown): e is AxiosError {
  return (
    typeof e === "object" &&
    e !== null &&
    "isAxiosError" in e &&
    (e as AxiosError).isAxiosError === true
  );
}

/** Lowercased text of an error response body, for message sniffing. */
function responseBodyText(error: AxiosError): string {
  const data = error.response?.data;
  if (data == null) return "";
  try {
    return (typeof data === "string" ? data : JSON.stringify(data)).toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Classify a thrown request error. Instagram signals a soft block with a 200
 * body as often as with a 429, so the body text is checked too.
 */
export function classifyScrapeError(error: unknown): ScrapeErrorKind {
  if (error instanceof ScrapeRequestError) return error.kind;

  if (!isAxiosError(error)) return "fatal";

  const status = error.response?.status;
  const body = responseBodyText(error);

  if (
    body.includes("login_required") ||
    body.includes("checkpoint_required") ||
    body.includes("challenge_required")
  ) {
    return "auth";
  }
  if (status === 401 || status === 403) return "auth";

  if (status === 429 || body.includes("please wait") || body.includes("spam")) {
    return "rate_limited";
  }

  // No response at all means the request never completed — DNS, reset socket,
  // or our own timeout. All worth another attempt.
  if (!error.response) return "transient";

  if (status != null && status >= 500) return "transient";

  return "fatal";
}

/** `Retry-After` in ms, when the server told us how long to wait. */
function retryAfterMs(error: unknown): number | null {
  if (!isAxiosError(error)) return null;
  const header = error.response?.headers?.["retry-after"];
  if (typeof header !== "string") return null;

  const seconds = Number(header);
  if (Number.isFinite(seconds)) return seconds * 1000;

  const date = Date.parse(header);
  return Number.isNaN(date) ? null : Math.max(0, date - Date.now());
}

/** Exponential backoff with full jitter, capped. */
function backoffMs(attempt: number): number {
  const ceiling = Math.min(
    SCRAPE_RETRY_BASE_MS * 2 ** attempt,
    SCRAPE_RETRY_MAX_MS
  );
  return Math.round(ceiling * (0.5 + Math.random() * 0.5));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface FetchPageOptions {
  cookie: string;
  userAgent?: string;
  maxId?: string;
  count?: number;
  /** Called after each failed attempt, so the run can count retries. */
  onRetry?: (info: {
    attempt: number;
    waitMs: number;
    kind: ScrapeErrorKind;
  }) => void;
}

async function requestSavedPostsPage(
  options: FetchPageOptions
): Promise<InstagramSavedResponse> {
  const {
    cookie,
    userAgent = DEFAULT_USER_AGENT,
    maxId,
    count = DEFAULT_PAGE_COUNT,
  } = options;

  const url = new URL(INSTAGRAM_SAVED_POSTS_URL);
  url.searchParams.set("count", String(count));
  url.searchParams.set("include_feed_only", "false");
  if (maxId) {
    url.searchParams.set("max_id", maxId);
  }

  const response = await axios.get(url.toString(), {
    headers: {
      "User-Agent": userAgent,
      Cookie: cookie,
    },
    timeout: SCRAPE_REQUEST_TIMEOUT_MS,
  });

  const data: InstagramSavedResponse = response.data;

  if (data.status !== "ok") {
    // A non-"ok" body with a 200 is how Instagram reports soft blocks.
    const serialized = JSON.stringify(data).toLowerCase();
    const kind: ScrapeErrorKind =
      serialized.includes("login_required") ||
      serialized.includes("checkpoint_required")
        ? "auth"
        : serialized.includes("please wait") || serialized.includes("spam")
          ? "rate_limited"
          : "fatal";
    throw new ScrapeRequestError(
      `Instagram API returned status: ${data.status}`,
      kind
    );
  }

  return data;
}

/**
 * Fetch one page of saved posts, retrying rate limits and transient network
 * failures. Throws a `ScrapeRequestError` carrying the final verdict so the
 * caller can decide whether the run is resumable.
 */
export async function fetchSavedPostsPage(
  options: FetchPageOptions
): Promise<InstagramSavedResponse> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= SCRAPE_MAX_RETRIES; attempt++) {
    try {
      return await requestSavedPostsPage(options);
    } catch (error) {
      lastError = error;
      const kind = classifyScrapeError(error);

      const retryable = kind === "rate_limited" || kind === "transient";
      if (!retryable || attempt === SCRAPE_MAX_RETRIES) break;

      const waitMs = retryAfterMs(error) ?? backoffMs(attempt);
      options.onRetry?.({ attempt: attempt + 1, waitMs, kind });
      logger.warn(
        { kind, attempt: attempt + 1, waitMs, maxId: options.maxId },
        "[instagram-api] Page request failed, retrying"
      );
      await delay(waitMs);
    }
  }

  const kind = classifyScrapeError(lastError);
  const status = isAxiosError(lastError) ? lastError.response?.status : undefined;
  const message =
    lastError instanceof Error ? lastError.message : "Unknown error";

  throw new ScrapeRequestError(message, kind, { status, cause: lastError });
}

export interface LoggedInUser {
  pk: string;
  username: string;
  profilePicUrl: string | null;
}

/**
 * Best-effort fetch of the logged-in account behind a cookie (used to
 * auto-fill a profile's avatar). Parses `ds_user_id` from the cookie and
 * calls the user-info endpoint. Returns null on any failure.
 */
export async function fetchLoggedInUser(
  cookie: string,
  userAgent: string = DEFAULT_USER_AGENT
): Promise<LoggedInUser | null> {
  const match = cookie.match(/ds_user_id=(\d+)/);
  if (!match) return null;
  const userId = match[1];

  try {
    const response = await axios.get(
      `https://i.instagram.com/api/v1/users/${userId}/info/`,
      {
        headers: { "User-Agent": userAgent, Cookie: cookie },
        timeout: SCRAPE_REQUEST_TIMEOUT_MS,
      }
    );
    const user = response.data?.user;
    if (!user) return null;
    return {
      pk: String(user.pk ?? userId),
      username: user.username ?? "",
      profilePicUrl: user.profile_pic_url ?? null,
    };
  } catch {
    return null;
  }
}
