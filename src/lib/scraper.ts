import { db } from "@/db";
import {
  accountStatusHistory,
  accountUsernameHistory,
  accounts,
  posts,
  scrapeRuns,
  settings,
  carouselMedia,
} from "@/db/schema";
import { fetchSavedPostsPage } from "./instagram-api";
import {
  getCloudinaryConfig,
  isCloudinaryConfigured,
} from "./cloudinary";
import { runCloudinarySync } from "./cloudinary-sync";
import { PRIVATE_ACCOUNT_STATUS } from "./account-metadata";
import { eq, sql } from "drizzle-orm";
import { createHash } from "crypto";
import type { AxiosError } from "axios";
import type { InstagramMedia } from "@/types/instagram";
import { SCRAPE_DELAY_MIN_MS, SCRAPE_DELAY_MAX_MS } from "./constants";

/** Returns true if the error is an Axios HTTP error with a response body */
function isAxiosError(e: unknown): e is AxiosError {
  return (
    typeof e === "object" &&
    e !== null &&
    "isAxiosError" in e &&
    (e as AxiosError).isAxiosError === true
  );
}

/** Extract error message + optional JSON-stringified API response body */
function extractErrorInfo(error: unknown): { errorMsg: string; errorBody: string | null } {
  const errorMsg = error instanceof Error ? error.message : "Unknown error";
  let errorBody: string | null = null;
  if (isAxiosError(error) && error.response?.data) {
    try {
      errorBody = JSON.stringify(error.response.data, null, 2);
    } catch {
      errorBody = String(error.response.data);
    }
  }
  return { errorMsg, errorBody };
}

function getPrivacyStatusUpdate(
  currentStatus: string | null | undefined,
  isPrivate: boolean,
  changedAt: string
) {
  if (isPrivate && currentStatus !== PRIVATE_ACCOUNT_STATUS) {
    return {
      updates: {
        accountStatus: PRIVATE_ACCOUNT_STATUS,
        statusChangedAt: changedAt,
      },
      recordHistory: true,
    };
  }

  if (!isPrivate && currentStatus === PRIVATE_ACCOUNT_STATUS) {
    return {
      updates: {
        accountStatus: null,
        statusChangedAt: null,
      },
      recordHistory: false,
    };
  }

  return {
    updates: {},
    recordHistory: false,
  };
}

function recordAccountStatus(accountPk: string, status: string, changedAt: string) {
  db.insert(accountStatusHistory)
    .values({
      accountPk,
      status,
      changedAt,
    })
    .run();
}

function recordUsernameChange({
  accountPk,
  oldUsername,
  newUsername,
  runId,
  changedAt,
}: {
  accountPk: string;
  oldUsername: string;
  newUsername: string;
  runId: number;
  changedAt: string;
}) {
  db.insert(accountUsernameHistory)
    .values({
      accountPk,
      oldUsername,
      newUsername,
      scrapeRunId: runId,
      changedAt,
    })
    .run();

  usernameChangeAccountPks.add(accountPk);
  console.info(
    `[scraper] Account username changed for pk ${accountPk}: @${oldUsername} -> @${newUsername}`
  );
}

export interface ScrapeProgress {
  runId: number;
  status: "running" | "completed" | "failed" | "cancelled" | "interrupted";
  pagesScraped: number;
  totalPostsFound: number;
  newPostsAdded: number;
  newAccountsFound: number;
}

let currentScrapeState: ScrapeProgress | null = null;

// Tracks which account PKs were seen in the current scrape (reset each run)
let seenAccountPks = new Set<string>();
let usernameChangeAccountPks = new Set<string>();

export function getCurrentScrapeState(): ScrapeProgress | null {
  return currentScrapeState;
}

/**
 * Mark any "running" runs in the DB as "interrupted".
 * Called on GET /api/scrape to detect orphaned runs from a previous server process.
 * Safe to call repeatedly — no-op when nothing is stuck.
 */
export function detectAndMarkInterruptedRuns(): void {
  // Only mark as interrupted if there's no active in-memory scrape running
  if (currentScrapeState?.status === "running") return;
  db.update(scrapeRuns)
    .set({ status: "interrupted" })
    .where(eq(scrapeRuns.status, "running"))
    .run();
}

export async function runScrape(): Promise<number> {
  if (currentScrapeState?.status === "running") {
    throw new Error("A scrape is already in progress");
  }

  const cookieRow = db
    .select()
    .from(settings)
    .where(eq(settings.key, "instagram_cookie"))
    .get();

  if (!cookieRow) {
    throw new Error("No Instagram cookie configured. Go to Settings first.");
  }

  const userAgentRow = db
    .select()
    .from(settings)
    .where(eq(settings.key, "user_agent"))
    .get();

  const now = new Date().toISOString();
  const run = db
    .insert(scrapeRuns)
    .values({ startedAt: now, status: "running" })
    .returning()
    .get();

  currentScrapeState = {
    runId: run.id,
    status: "running",
    pagesScraped: 0,
    totalPostsFound: 0,
    newPostsAdded: 0,
    newAccountsFound: 0,
  };

  seenAccountPks = new Set<string>();
  usernameChangeAccountPks = new Set<string>();

  scrapeAllPages(run.id, cookieRow.value, userAgentRow?.value, run.startedAt).catch(
    (error) => {
      const { errorMsg, errorBody } = extractErrorInfo(error);
      db.update(scrapeRuns)
        .set({
          status: "failed",
          completedAt: new Date().toISOString(),
          errorMessage: errorMsg,
          errorBody,
        })
        .where(eq(scrapeRuns.id, run.id))
        .run();

      if (currentScrapeState?.runId === run.id) {
        currentScrapeState.status = "failed";
      }
    }
  );

  return run.id;
}

/**
 * Resume an interrupted scrape from its saved checkpoint cursor.
 */
export async function resumeScrape(runId: number): Promise<void> {
  if (currentScrapeState?.status === "running") {
    throw new Error("A scrape is already in progress");
  }

  const run = db
    .select()
    .from(scrapeRuns)
    .where(eq(scrapeRuns.id, runId))
    .get();

  if (!run) throw new Error("Scrape run not found");
  if (run.status !== "interrupted") throw new Error("Only interrupted runs can be resumed");

  const cookieRow = db
    .select()
    .from(settings)
    .where(eq(settings.key, "instagram_cookie"))
    .get();

  if (!cookieRow) {
    throw new Error("No Instagram cookie configured. Go to Settings first.");
  }

  const userAgentRow = db
    .select()
    .from(settings)
    .where(eq(settings.key, "user_agent"))
    .get();

  // Restore in-memory state from DB
  currentScrapeState = {
    runId: run.id,
    status: "running",
    pagesScraped: run.pagesScraped,
    totalPostsFound: run.totalPostsFound,
    newPostsAdded: run.newPostsAdded,
    newAccountsFound: run.newAccountsFound,
  };

  seenAccountPks = new Set<string>();
  usernameChangeAccountPks = new Set<string>();

  db.update(scrapeRuns)
    .set({ status: "running", completedAt: null })
    .where(eq(scrapeRuns.id, run.id))
    .run();

  scrapeAllPages(run.id, cookieRow.value, userAgentRow?.value, run.startedAt, run.checkpointMaxId ?? undefined).catch(
    (error) => {
      const { errorMsg, errorBody } = extractErrorInfo(error);
      db.update(scrapeRuns)
        .set({
          status: "failed",
          completedAt: new Date().toISOString(),
          errorMessage: errorMsg,
          errorBody,
        })
        .where(eq(scrapeRuns.id, run.id))
        .run();

      if (currentScrapeState?.runId === run.id) {
        currentScrapeState.status = "failed";
      }
    }
  );
}

async function scrapeAllPages(
  runId: number,
  cookie: string,
  userAgent?: string,
  runStartedAt?: string,
  resumeFromMaxId?: string
): Promise<void> {
  let maxId: string | undefined = resumeFromMaxId;
  let hasMore = true;

  try {
    while (hasMore) {
      const page = await fetchSavedPostsPage({
        cookie,
        userAgent,
        maxId,
      });

      for (const item of page.items) {
        await processMediaItem(item.media, runId);
      }

      if (currentScrapeState?.runId === runId) {
        currentScrapeState.pagesScraped += 1;
        currentScrapeState.totalPostsFound += page.num_results;
      }

      hasMore = page.more_available;
      maxId = page.next_max_id;

      db.update(scrapeRuns)
        .set({
          pagesScraped: currentScrapeState!.pagesScraped,
          totalPostsFound: currentScrapeState!.totalPostsFound,
          newPostsAdded: currentScrapeState!.newPostsAdded,
          newAccountsFound: currentScrapeState!.newAccountsFound,
          checkpointMaxId: maxId ?? null,
        })
        .where(eq(scrapeRuns.id, runId))
        .run();

      if (hasMore) {
        await delay(
          SCRAPE_DELAY_MIN_MS +
            Math.random() * (SCRAPE_DELAY_MAX_MS - SCRAPE_DELAY_MIN_MS)
        );
      }
    }

    recalculateAccountPostCounts();

    // Calculate lost accounts (only on full successful completion)
    const { count: lostCount, pks: lostPks } = calculateLostAccounts(runStartedAt);
    const usernameChangePks = [...usernameChangeAccountPks];

    db.update(scrapeRuns)
      .set({
        status: "completed",
        completedAt: new Date().toISOString(),
        totalPostsFound: currentScrapeState!.totalPostsFound,
        newPostsAdded: currentScrapeState!.newPostsAdded,
        newAccountsFound: currentScrapeState!.newAccountsFound,
        pagesScraped: currentScrapeState!.pagesScraped,
        checkpointMaxId: null,
        lostAccountsCount: lostCount,
        lostAccountPks: lostPks.length > 0 ? JSON.stringify(lostPks) : null,
        usernameChangesCount: usernameChangePks.length,
        usernameChangeAccountPks:
          usernameChangePks.length > 0 ? JSON.stringify(usernameChangePks) : null,
      })
      .where(eq(scrapeRuns.id, runId))
      .run();

    if (currentScrapeState?.runId === runId) {
      currentScrapeState.status = "completed";
    }

    // Auto-trigger Cloudinary sync as a background job after scraping
    const cloudinaryConfig = getCloudinaryConfig();
    if (isCloudinaryConfigured(cloudinaryConfig)) {
      runCloudinarySync().catch((err: Error) => {
        console.warn("[scraper] Auto Cloudinary sync failed to start:", err.message);
      });
    }
  } catch (error) {
    const { errorMsg, errorBody } = extractErrorInfo(error);
    db.update(scrapeRuns)
      .set({
        status: "failed",
        completedAt: new Date().toISOString(),
        errorMessage: errorMsg,
        errorBody,
      })
      .where(eq(scrapeRuns.id, runId))
      .run();

    if (currentScrapeState?.runId === runId) {
      currentScrapeState.status = "failed";
    }
  }
}

/** Fetch image bytes and compute SHA-256 hash. Returns null on failure. */
async function hashImageUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://www.instagram.com/",
      },
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    return createHash("sha256").update(Buffer.from(buffer)).digest("hex");
  } catch {
    return null;
  }
}

async function processMediaItem(
  media: InstagramMedia,
  runId: number
): Promise<void> {
  const now = new Date().toISOString();
  const mediaPk = String(media.pk);
  const accountPkStr = String(media.user.pk);

  // Track this account as seen in the current scrape
  seenAccountPks.add(accountPkStr);

  // ─── UPSERT ACCOUNT ──────────────────────────────────────
  const existingAccount = db
    .select()
    .from(accounts)
    .where(eq(accounts.pk, accountPkStr))
    .get();

  // Hash the profile pic to detect changes (kept for hash-change detection)
  let profilePicHash: string | null = null;
  if (media.user.profile_pic_url) {
    profilePicHash = await hashImageUrl(media.user.profile_pic_url);
  }

  const hashChanged =
    profilePicHash != null &&
    existingAccount?.profilePicHash !== profilePicHash;
  const privacyStatusUpdate = getPrivacyStatusUpdate(
    existingAccount?.accountStatus,
    media.user.is_private,
    now
  );

  if (!existingAccount) {
    db.insert(accounts)
      .values({
        pk: accountPkStr,
        username: media.user.username,
        fullName: media.user.full_name,
        isVerified: media.user.is_verified,
        isPrivate: media.user.is_private,
        profilePicUrl: media.user.profile_pic_url,
        profilePicHash,
        cloudinaryProfilePicUrl: null, // Cloudinary sync will handle upload
        ...privacyStatusUpdate.updates,
        savedPostCount: 0,
        firstSeenAt: now,
        lastSeenAt: now,
        discoveredInRunId: runId,
      })
      .run();

    if (currentScrapeState) {
      currentScrapeState.newAccountsFound += 1;
    }

    if (privacyStatusUpdate.recordHistory) {
      recordAccountStatus(accountPkStr, PRIVATE_ACCOUNT_STATUS, now);
    }
  } else {
    const previousUsername = existingAccount.username;
    const nextUsername = media.user.username;

    db.update(accounts)
      .set({
        username: nextUsername,
        fullName: media.user.full_name,
        isVerified: media.user.is_verified,
        isPrivate: media.user.is_private,
        profilePicUrl: media.user.profile_pic_url, // always refresh CDN URL
        ...(profilePicHash ? { profilePicHash } : {}),
        // If pic changed, null out cloudinary URL so sync re-uploads it
        ...(hashChanged ? { cloudinaryProfilePicUrl: null } : {}),
        ...privacyStatusUpdate.updates,
        lastSeenAt: now,
      })
      .where(eq(accounts.pk, accountPkStr))
      .run();

    if (previousUsername !== nextUsername) {
      recordUsernameChange({
        accountPk: accountPkStr,
        oldUsername: previousUsername,
        newUsername: nextUsername,
        runId,
        changedAt: now,
      });
    }

    if (privacyStatusUpdate.recordHistory) {
      recordAccountStatus(accountPkStr, PRIVATE_ACCOUNT_STATUS, now);
    }
  }

  // ─── UPSERT POST ─────────────────────────────────────────
  const existingPost = db
    .select()
    .from(posts)
    .where(eq(posts.pk, mediaPk))
    .get();

  const thumbnail = media.image_versions2?.candidates?.[0];
  const thumbnailUrl = thumbnail?.url ?? null;

  if (!existingPost) {
    db.insert(posts)
      .values({
        pk: mediaPk,
        id: media.id,
        code: media.code,
        accountPk: accountPkStr,
        mediaType: media.media_type,
        takenAt: media.taken_at,
        captionText: media.caption?.text ?? null,
        likeCount: media.like_count,
        commentCount: media.comment_count ?? 0,
        thumbnailUrl,
        cloudinaryThumbnailUrl: null, // Cloudinary sync will handle upload
        thumbnailWidth: thumbnail?.width ?? null,
        thumbnailHeight: thumbnail?.height ?? null,
        carouselMediaCount: media.carousel_media_count ?? null,
        scrapeRunId: runId,
        createdAt: now,
      })
      .run();

    if (currentScrapeState) {
      currentScrapeState.newPostsAdded += 1;
    }

    await insertOrUpdateCarouselItems(mediaPk, media, true);
  } else {
    db.update(posts)
      .set({
        likeCount: media.like_count,
        commentCount: media.comment_count ?? 0,
        captionText: media.caption?.text ?? null,
        thumbnailUrl: thumbnailUrl ?? existingPost.thumbnailUrl, // refresh CDN URL
      })
      .where(eq(posts.pk, mediaPk))
      .run();

    await insertOrUpdateCarouselItems(mediaPk, media, false);
  }
}

/** Insert new carousel items or update existing ones with fresh URLs */
async function insertOrUpdateCarouselItems(
  postPk: string,
  media: InstagramMedia,
  isNewPost: boolean
): Promise<void> {
  if (!media.carousel_media || media.carousel_media.length === 0) return;

  const existingItems = isNewPost
    ? []
    : db
        .select()
        .from(carouselMedia)
        .where(eq(carouselMedia.postPk, postPk))
        .all();

  for (let i = 0; i < media.carousel_media.length; i++) {
    const carouselItem = media.carousel_media[i];
    const imageUrl =
      carouselItem.image_versions2?.candidates?.[0]?.url ?? null;
    const videoUrl = carouselItem.video_versions?.[0]?.url ?? null;
    const width =
      carouselItem.image_versions2?.candidates?.[0]?.width ??
      carouselItem.video_versions?.[0]?.width ??
      null;
    const height =
      carouselItem.image_versions2?.candidates?.[0]?.height ??
      carouselItem.video_versions?.[0]?.height ??
      null;

    const existingItem = existingItems.find((item) => item.position === i);

    if (existingItem) {
      const nextMediaUrl = imageUrl ?? videoUrl ?? existingItem.mediaUrl;
      const nextVideoUrl = videoUrl ?? existingItem.videoUrl;
      const nextWidth = width ?? existingItem.width;
      const nextHeight = height ?? existingItem.height;

      db.update(carouselMedia)
        .set({
          mediaUrl: nextMediaUrl,
          videoUrl: nextVideoUrl,
          width: nextWidth,
          height: nextHeight,
        })
        .where(eq(carouselMedia.id, existingItem.id))
        .run();
    } else {
      db.insert(carouselMedia)
        .values({
          postPk,
          position: i,
          mediaType: carouselItem.media_type,
          mediaUrl: imageUrl ?? videoUrl ?? "",
          width,
          height,
          videoUrl: videoUrl ?? null,
          videoDuration: carouselItem.video_duration ?? null,
          cloudinaryUrl: null, // Cloudinary sync will handle upload
        })
        .run();
    }
  }
}

function recalculateAccountPostCounts(): void {
  db.run(sql`
    UPDATE accounts
    SET saved_post_count = (
      SELECT COUNT(*) FROM posts WHERE posts.account_pk = accounts.pk
    )
  `);
}

/**
 * After a completed scrape, find accounts not seen during this run.
 * Uses lastSeenAt < runStartedAt as the signal — processMediaItem always
 * updates lastSeenAt for every account it encounters.
 */
function calculateLostAccounts(runStartedAt?: string): { count: number; pks: string[] } {
  if (!runStartedAt) return { count: 0, pks: [] };

  const lost = db
    .select({ pk: accounts.pk })
    .from(accounts)
    .where(sql`${accounts.lastSeenAt} < ${runStartedAt}`)
    .all();

  return { count: lost.length, pks: lost.map((a) => a.pk) };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
