import { prisma, getNextScrapeRunId } from "./prisma";
import { fetchSavedPostsPage } from "./instagram-api";
import { getCloudinaryConfig, isCloudinaryConfigured } from "./cloudinary";
import { runCloudinarySync } from "./cloudinary-sync";
import { PRIVATE_ACCOUNT_STATUS } from "./account-metadata";
import { logger } from "./logger";
import * as Sentry from "@sentry/nextjs";
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
function extractErrorInfo(error: unknown): {
  errorMsg: string;
  errorBody: string | null;
} {
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

async function recordAccountStatus(
  accountPk: string,
  status: string,
  changedAt: string
) {
  await prisma.accountStatusHistory.create({
    data: { accountPk, status, changedAt },
  });
}

async function recordUsernameChange({
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
  await prisma.accountUsernameHistory.create({
    data: {
      accountPk,
      oldUsername,
      newUsername,
      scrapeRunId: runId,
      changedAt,
    },
  });

  usernameChangeAccountPks.add(accountPk);
  logger.info(
    { accountPk, oldUsername, newUsername },
    "[scraper] Account username changed"
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
export async function detectAndMarkInterruptedRuns(): Promise<void> {
  // Only mark as interrupted if there's no active in-memory scrape running
  if (currentScrapeState?.status === "running") return;
  await prisma.scrapeRun.updateMany({
    where: { status: "running" },
    data: { status: "interrupted" },
  });
}

export async function runScrape(): Promise<number> {
  if (currentScrapeState?.status === "running") {
    throw new Error("A scrape is already in progress");
  }

  const cookieRow = await prisma.setting.findUnique({
    where: { key: "instagram_cookie" },
  });

  if (!cookieRow) {
    throw new Error("No Instagram cookie configured. Go to Settings first.");
  }

  const userAgentRow = await prisma.setting.findUnique({
    where: { key: "user_agent" },
  });

  const now = new Date().toISOString();
  const runId = await getNextScrapeRunId();
  const run = await prisma.scrapeRun.create({
    data: { id: runId, startedAt: now, status: "running" },
  });

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

  scrapeAllPages(
    run.id,
    cookieRow.value,
    userAgentRow?.value,
    run.startedAt
  ).catch((error) => {
    void handleScrapeFailure(run.id, error);
  });

  return run.id;
}

/**
 * Resume an interrupted scrape from its saved checkpoint cursor.
 */
export async function resumeScrape(runId: number): Promise<void> {
  if (currentScrapeState?.status === "running") {
    throw new Error("A scrape is already in progress");
  }

  const run = await prisma.scrapeRun.findUnique({ where: { id: runId } });

  if (!run) throw new Error("Scrape run not found");
  if (run.status !== "interrupted")
    throw new Error("Only interrupted runs can be resumed");

  const cookieRow = await prisma.setting.findUnique({
    where: { key: "instagram_cookie" },
  });

  if (!cookieRow) {
    throw new Error("No Instagram cookie configured. Go to Settings first.");
  }

  const userAgentRow = await prisma.setting.findUnique({
    where: { key: "user_agent" },
  });

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

  await prisma.scrapeRun.update({
    where: { id: run.id },
    data: { status: "running", completedAt: null },
  });

  scrapeAllPages(
    run.id,
    cookieRow.value,
    userAgentRow?.value,
    run.startedAt,
    run.checkpointMaxId ?? undefined
  ).catch((error) => {
    void handleScrapeFailure(run.id, error);
  });
}

async function handleScrapeFailure(
  runId: number,
  error: unknown
): Promise<void> {
  const { errorMsg, errorBody } = extractErrorInfo(error);
  Sentry.captureException(error, {
    tags: { feature: "scrape" },
    extra: { runId },
  });
  logger.error({ err: error, runId }, "[scraper] Scrape run failed");
  await prisma.scrapeRun
    .update({
      where: { id: runId },
      data: {
        status: "failed",
        completedAt: new Date().toISOString(),
        errorMessage: errorMsg,
        errorBody,
      },
    })
    .catch(() => {});

  if (currentScrapeState?.runId === runId) {
    currentScrapeState.status = "failed";
  }
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

      await prisma.scrapeRun.update({
        where: { id: runId },
        data: {
          pagesScraped: currentScrapeState!.pagesScraped,
          totalPostsFound: currentScrapeState!.totalPostsFound,
          newPostsAdded: currentScrapeState!.newPostsAdded,
          newAccountsFound: currentScrapeState!.newAccountsFound,
          checkpointMaxId: maxId ?? null,
        },
      });

      if (hasMore) {
        await delay(
          SCRAPE_DELAY_MIN_MS +
            Math.random() * (SCRAPE_DELAY_MAX_MS - SCRAPE_DELAY_MIN_MS)
        );
      }
    }

    await recalculateAccountPostCounts();

    // Calculate lost accounts (only on full successful completion)
    const { count: lostCount, pks: lostPks } = await calculateLostAccounts(
      runStartedAt
    );
    const usernameChangePks = [...usernameChangeAccountPks];

    await prisma.scrapeRun.update({
      where: { id: runId },
      data: {
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
          usernameChangePks.length > 0
            ? JSON.stringify(usernameChangePks)
            : null,
      },
    });

    if (currentScrapeState?.runId === runId) {
      currentScrapeState.status = "completed";
    }

    logger.info(
      {
        runId,
        newPostsAdded: currentScrapeState?.newPostsAdded,
        newAccountsFound: currentScrapeState?.newAccountsFound,
        lostCount,
        usernameChanges: usernameChangePks.length,
      },
      "[scraper] Scrape completed"
    );

    // Auto-trigger Cloudinary sync as a background job after scraping
    const cloudinaryConfig = getCloudinaryConfig();
    if (isCloudinaryConfigured(cloudinaryConfig)) {
      runCloudinarySync().catch((err: Error) => {
        logger.warn(
          { err },
          "[scraper] Auto Cloudinary sync failed to start"
        );
      });
    }
  } catch (error) {
    await handleScrapeFailure(runId, error);
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
  const existingAccount = await prisma.account.findUnique({
    where: { pk: accountPkStr },
  });

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
    await prisma.account.create({
      data: {
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
      },
    });

    if (currentScrapeState) {
      currentScrapeState.newAccountsFound += 1;
    }

    if (privacyStatusUpdate.recordHistory) {
      await recordAccountStatus(accountPkStr, PRIVATE_ACCOUNT_STATUS, now);
    }
  } else {
    const previousUsername = existingAccount.username;
    const nextUsername = media.user.username;

    await prisma.account.update({
      where: { pk: accountPkStr },
      data: {
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
      },
    });

    if (previousUsername !== nextUsername) {
      await recordUsernameChange({
        accountPk: accountPkStr,
        oldUsername: previousUsername,
        newUsername: nextUsername,
        runId,
        changedAt: now,
      });
    }

    if (privacyStatusUpdate.recordHistory) {
      await recordAccountStatus(accountPkStr, PRIVATE_ACCOUNT_STATUS, now);
    }
  }

  // ─── UPSERT POST ─────────────────────────────────────────
  const existingPost = await prisma.post.findUnique({
    where: { pk: mediaPk },
  });

  const thumbnail = media.image_versions2?.candidates?.[0];
  const thumbnailUrl = thumbnail?.url ?? null;

  if (!existingPost) {
    await prisma.post.create({
      data: {
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
      },
    });

    if (currentScrapeState) {
      currentScrapeState.newPostsAdded += 1;
    }

    await insertOrUpdateCarouselItems(mediaPk, media, true);
  } else {
    await prisma.post.update({
      where: { pk: mediaPk },
      data: {
        likeCount: media.like_count,
        commentCount: media.comment_count ?? 0,
        captionText: media.caption?.text ?? null,
        thumbnailUrl: thumbnailUrl ?? existingPost.thumbnailUrl, // refresh CDN URL
      },
    });

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
    : await prisma.carouselMedia.findMany({ where: { postPk } });

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
      await prisma.carouselMedia.update({
        where: { id: existingItem.id },
        data: {
          mediaUrl: imageUrl ?? videoUrl ?? existingItem.mediaUrl,
          videoUrl: videoUrl ?? existingItem.videoUrl,
          width: width ?? existingItem.width,
          height: height ?? existingItem.height,
        },
      });
    } else {
      await prisma.carouselMedia.create({
        data: {
          postPk,
          position: i,
          mediaType: carouselItem.media_type,
          mediaUrl: imageUrl ?? videoUrl ?? "",
          width,
          height,
          videoUrl: videoUrl ?? null,
          videoDuration: carouselItem.video_duration ?? null,
          cloudinaryUrl: null, // Cloudinary sync will handle upload
        },
      });
    }
  }
}

async function recalculateAccountPostCounts(): Promise<void> {
  const grouped = await prisma.post.groupBy({
    by: ["accountPk"],
    _count: { _all: true },
  });
  const countByPk = new Map<string, number>(
    grouped.map((g) => [g.accountPk, g._count._all])
  );

  const accountsList = await prisma.account.findMany({
    select: { pk: true, savedPostCount: true },
  });

  await Promise.all(
    accountsList.map((account) => {
      const desired = countByPk.get(account.pk) ?? 0;
      if (desired === account.savedPostCount) return Promise.resolve();
      return prisma.account.update({
        where: { pk: account.pk },
        data: { savedPostCount: desired },
      });
    })
  );
}

/**
 * After a completed scrape, find accounts not seen during this run.
 * Uses lastSeenAt < runStartedAt as the signal — processMediaItem always
 * updates lastSeenAt for every account it encounters.
 */
async function calculateLostAccounts(
  runStartedAt?: string
): Promise<{ count: number; pks: string[] }> {
  if (!runStartedAt) return { count: 0, pks: [] };

  const lost = await prisma.account.findMany({
    where: { lastSeenAt: { lt: runStartedAt } },
    select: { pk: true },
  });

  return { count: lost.length, pks: lost.map((a) => a.pk) };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
