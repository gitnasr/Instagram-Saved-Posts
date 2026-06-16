import { prisma, getNextScrapeRunId } from "./prisma";
import { fetchSavedPostsPage, fetchLoggedInUser } from "./instagram-api";
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
  profileId: string,
  accountPk: string,
  status: string,
  changedAt: string
) {
  await prisma.accountStatusHistory.create({
    data: { profileId, accountPk, status, changedAt },
  });
}

async function recordUsernameChange(
  runtime: Runtime,
  {
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
  }
) {
  await prisma.accountUsernameHistory.create({
    data: {
      profileId: runtime.state.profileId,
      accountPk,
      oldUsername,
      newUsername,
      scrapeRunId: runId,
      changedAt,
    },
  });

  runtime.usernameChanges.add(accountPk);
  logger.info(
    { accountPk, oldUsername, newUsername },
    "[scraper] Account username changed"
  );
}

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
interface Runtime {
  state: ScrapeProgress;
  seenAccountPks: Set<string>;
  usernameChanges: Set<string>;
}

// Each profile gets its own runtime so scrapes are fully independent.
const runtimes = new Map<string, Runtime>();

export function getCurrentScrapeState(profileId: string): ScrapeProgress | null {
  return runtimes.get(profileId)?.state ?? null;
}

/**
 * Mark "running" runs in the DB as "interrupted" when no in-memory runtime is
 * actively driving them (orphans from a previous server process). Scoped to a
 * profile when given. Safe to call repeatedly.
 */
export async function detectAndMarkInterruptedRuns(
  profileId?: string
): Promise<void> {
  const liveRunIds = [...runtimes.values()]
    .filter((r) => r.state.status === "running")
    .map((r) => r.state.runId);

  await prisma.scrapeRun.updateMany({
    where: {
      status: "running",
      id: { notIn: liveRunIds },
      ...(profileId ? { profileId } : {}),
    },
    data: { status: "interrupted" },
  });
}

export async function runScrape(profileId: string): Promise<number> {
  if (runtimes.get(profileId)?.state.status === "running") {
    throw new Error("A scrape is already in progress for this profile");
  }

  const profile = await prisma.profile.findUnique({ where: { id: profileId } });
  if (!profile) {
    throw new Error("Profile not found");
  }
  if (!profile.instagramCookie) {
    throw new Error(
      "No Instagram cookie configured for this profile. Go to Settings first."
    );
  }

  const now = new Date().toISOString();
  const runId = await getNextScrapeRunId();
  const run = await prisma.scrapeRun.create({
    data: { id: runId, profileId, startedAt: now, status: "running" },
  });

  const runtime = createRuntime(run.id, profileId);
  runtimes.set(profileId, runtime);

  scrapeAllPages(
    runtime,
    profile.instagramCookie,
    profile.userAgent ?? undefined,
    run.startedAt
  ).catch((error) => {
    void handleScrapeFailure(runtime, error);
  });

  return run.id;
}

/**
 * Resume an interrupted scrape from its saved checkpoint cursor.
 */
export async function resumeScrape(
  profileId: string,
  runId: number
): Promise<void> {
  if (runtimes.get(profileId)?.state.status === "running") {
    throw new Error("A scrape is already in progress for this profile");
  }

  const run = await prisma.scrapeRun.findFirst({
    where: { id: runId, profileId },
  });

  if (!run) throw new Error("Scrape run not found");
  if (run.status !== "interrupted")
    throw new Error("Only interrupted runs can be resumed");

  const profile = await prisma.profile.findUnique({ where: { id: profileId } });
  if (!profile) {
    throw new Error("Profile not found");
  }
  if (!profile.instagramCookie) {
    throw new Error(
      "No Instagram cookie configured for this profile. Go to Settings first."
    );
  }

  const runtime = createRuntime(run.id, profileId);
  runtime.state.pagesScraped = run.pagesScraped;
  runtime.state.totalPostsFound = run.totalPostsFound;
  runtime.state.newPostsAdded = run.newPostsAdded;
  runtime.state.newAccountsFound = run.newAccountsFound;
  runtimes.set(profileId, runtime);

  await prisma.scrapeRun.update({
    where: { id: run.id },
    data: { status: "running", completedAt: null },
  });

  scrapeAllPages(
    runtime,
    profile.instagramCookie,
    profile.userAgent ?? undefined,
    run.startedAt,
    run.checkpointMaxId ?? undefined
  ).catch((error) => {
    void handleScrapeFailure(runtime, error);
  });
}

function createRuntime(runId: number, profileId: string): Runtime {
  return {
    state: {
      runId,
      profileId,
      status: "running",
      pagesScraped: 0,
      totalPostsFound: 0,
      newPostsAdded: 0,
      newAccountsFound: 0,
    },
    seenAccountPks: new Set<string>(),
    usernameChanges: new Set<string>(),
  };
}

async function handleScrapeFailure(
  runtime: Runtime,
  error: unknown
): Promise<void> {
  const { runId, profileId } = runtime.state;
  const { errorMsg, errorBody } = extractErrorInfo(error);
  Sentry.captureException(error, {
    tags: { feature: "scrape" },
    extra: { runId, profileId },
  });
  logger.error({ err: error, runId, profileId }, "[scraper] Scrape run failed");
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

  runtime.state.status = "failed";
}

async function scrapeAllPages(
  runtime: Runtime,
  cookie: string,
  userAgent?: string,
  runStartedAt?: string,
  resumeFromMaxId?: string
): Promise<void> {
  const { runId, profileId } = runtime.state;
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
        await processMediaItem(runtime, item.media);
      }

      runtime.state.pagesScraped += 1;
      runtime.state.totalPostsFound += page.num_results;

      hasMore = page.more_available;
      maxId = page.next_max_id;

      await prisma.scrapeRun.update({
        where: { id: runId },
        data: {
          pagesScraped: runtime.state.pagesScraped,
          totalPostsFound: runtime.state.totalPostsFound,
          newPostsAdded: runtime.state.newPostsAdded,
          newAccountsFound: runtime.state.newAccountsFound,
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

    await recalculateAccountPostCounts(profileId);

    // Calculate & persist lost-state transitions (only on full success).
    const runCompletedAt = new Date().toISOString();
    const lostState = runStartedAt
      ? await calculateAndUpdateLostState(
          profileId,
          runStartedAt,
          runCompletedAt
        )
      : { allLostPks: [], newlyLostPks: [], newlyRecoveredPks: [] };
    const usernameChangePks = [...runtime.usernameChanges];

    await prisma.scrapeRun.update({
      where: { id: runId },
      data: {
        status: "completed",
        completedAt: runCompletedAt,
        totalPostsFound: runtime.state.totalPostsFound,
        newPostsAdded: runtime.state.newPostsAdded,
        newAccountsFound: runtime.state.newAccountsFound,
        pagesScraped: runtime.state.pagesScraped,
        checkpointMaxId: null,
        lostAccountsCount: lostState.allLostPks.length,
        lostAccountPks:
          lostState.allLostPks.length > 0
            ? JSON.stringify(lostState.allLostPks)
            : null,
        newlyLostAccountsCount: lostState.newlyLostPks.length,
        newlyLostAccountPks:
          lostState.newlyLostPks.length > 0
            ? JSON.stringify(lostState.newlyLostPks)
            : null,
        newlyRecoveredAccountsCount: lostState.newlyRecoveredPks.length,
        newlyRecoveredAccountPks:
          lostState.newlyRecoveredPks.length > 0
            ? JSON.stringify(lostState.newlyRecoveredPks)
            : null,
        usernameChangesCount: usernameChangePks.length,
        usernameChangeAccountPks:
          usernameChangePks.length > 0
            ? JSON.stringify(usernameChangePks)
            : null,
      },
    });

    runtime.state.status = "completed";

    // Best-effort: fill in the profile's avatar from the logged-in account.
    await fillProfileAvatarIfNeeded(profileId, cookie, userAgent);

    logger.info(
      {
        runId,
        profileId,
        newPostsAdded: runtime.state.newPostsAdded,
        newAccountsFound: runtime.state.newAccountsFound,
        lostCount: lostState.allLostPks.length,
        newlyLost: lostState.newlyLostPks.length,
        newlyRecovered: lostState.newlyRecoveredPks.length,
        usernameChanges: usernameChangePks.length,
      },
      "[scraper] Scrape completed"
    );

    // Auto-trigger Cloudinary sync as a background job after scraping
    const cloudinaryConfig = getCloudinaryConfig();
    if (isCloudinaryConfigured(cloudinaryConfig)) {
      runCloudinarySync(profileId).catch((err: Error) => {
        logger.warn(
          { err },
          "[scraper] Auto Cloudinary sync failed to start"
        );
      });
    }
  } catch (error) {
    await handleScrapeFailure(runtime, error);
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
  runtime: Runtime,
  media: InstagramMedia
): Promise<void> {
  const { runId, profileId } = runtime.state;
  const now = new Date().toISOString();
  const mediaPk = String(media.pk);
  const accountPkStr = String(media.user.pk);

  // Track this account as seen in the current scrape
  runtime.seenAccountPks.add(accountPkStr);

  // ─── UPSERT ACCOUNT ──────────────────────────────────────
  const existingAccount = await prisma.account.findFirst({
    where: { profileId, pk: accountPkStr },
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
        profileId,
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

    runtime.state.newAccountsFound += 1;

    if (privacyStatusUpdate.recordHistory) {
      await recordAccountStatus(
        profileId,
        accountPkStr,
        PRIVATE_ACCOUNT_STATUS,
        now
      );
    }
  } else {
    const previousUsername = existingAccount.username;
    const nextUsername = media.user.username;

    await prisma.account.update({
      where: { id: existingAccount.id },
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
      await recordUsernameChange(runtime, {
        accountPk: accountPkStr,
        oldUsername: previousUsername,
        newUsername: nextUsername,
        runId,
        changedAt: now,
      });
    }

    if (privacyStatusUpdate.recordHistory) {
      await recordAccountStatus(
        profileId,
        accountPkStr,
        PRIVATE_ACCOUNT_STATUS,
        now
      );
    }
  }

  // ─── UPSERT POST ─────────────────────────────────────────
  const existingPost = await prisma.post.findFirst({
    where: { profileId, pk: mediaPk },
  });

  const thumbnail = media.image_versions2?.candidates?.[0];
  const thumbnailUrl = thumbnail?.url ?? null;

  if (!existingPost) {
    await prisma.post.create({
      data: {
        profileId,
        pk: mediaPk,
        mediaId: media.id,
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

    runtime.state.newPostsAdded += 1;

    await insertOrUpdateCarouselItems(profileId, mediaPk, media, true);
  } else {
    await prisma.post.update({
      where: { id: existingPost.id },
      data: {
        likeCount: media.like_count,
        commentCount: media.comment_count ?? 0,
        captionText: media.caption?.text ?? null,
        thumbnailUrl: thumbnailUrl ?? existingPost.thumbnailUrl, // refresh CDN URL
      },
    });

    await insertOrUpdateCarouselItems(profileId, mediaPk, media, false);
  }
}

/** Insert new carousel items or update existing ones with fresh URLs */
async function insertOrUpdateCarouselItems(
  profileId: string,
  postPk: string,
  media: InstagramMedia,
  isNewPost: boolean
): Promise<void> {
  if (!media.carousel_media || media.carousel_media.length === 0) return;

  const existingItems = isNewPost
    ? []
    : await prisma.carouselMedia.findMany({ where: { profileId, postPk } });

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
          profileId,
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

async function recalculateAccountPostCounts(profileId: string): Promise<void> {
  const grouped = await prisma.post.groupBy({
    by: ["accountPk"],
    where: { profileId },
    _count: { _all: true },
  });
  const countByPk = new Map<string, number>(
    grouped.map((g) => [g.accountPk, g._count._all])
  );

  const accountsList = await prisma.account.findMany({
    where: { profileId },
    select: { id: true, pk: true, savedPostCount: true },
  });

  await Promise.all(
    accountsList.map((account) => {
      const desired = countByPk.get(account.pk) ?? 0;
      if (desired === account.savedPostCount) return Promise.resolve();
      return prisma.account.update({
        where: { id: account.id },
        data: { savedPostCount: desired },
      });
    })
  );
}

/**
 * One-time per-profile backfill: stamp `lostAt` on accounts that were already
 * missing before this feature shipped, using the most recent prior completed
 * run's timestamps. Without this the first post-deploy scrape would flag every
 * pre-existing lost account as "newly lost."
 */
async function backfillLostStateIfNeeded(
  profileId: string,
  currentRunStartedAt: string
): Promise<void> {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { lostStateBackfilled: true },
  });
  if (profile?.lostStateBackfilled) return;

  const priorRun = await prisma.scrapeRun.findFirst({
    where: {
      profileId,
      status: "completed",
      completedAt: { lt: currentRunStartedAt },
    },
    orderBy: { completedAt: "desc" },
  });

  if (priorRun) {
    const stampedAt = priorRun.completedAt ?? priorRun.startedAt;
    await prisma.account.updateMany({
      where: {
        profileId,
        lastSeenAt: { lt: priorRun.startedAt },
        lostAt: null,
      },
      data: { lostAt: stampedAt },
    });
  }

  await prisma.profile.update({
    where: { id: profileId },
    data: { lostStateBackfilled: true, updatedAt: new Date().toISOString() },
  });
}

/**
 * After a completed scrape, partition accounts into newly-lost,
 * newly-recovered, and currently-lost sets, and persist the transitions
 * onto each Account row.
 */
async function calculateAndUpdateLostState(
  profileId: string,
  runStartedAt: string,
  runCompletedAt: string
): Promise<{
  allLostPks: string[];
  newlyLostPks: string[];
  newlyRecoveredPks: string[];
}> {
  await backfillLostStateIfNeeded(profileId, runStartedAt);

  const accounts = await prisma.account.findMany({
    where: { profileId },
    select: { pk: true, lastSeenAt: true, lostAt: true },
  });

  const newlyLostPks: string[] = [];
  const newlyRecoveredPks: string[] = [];
  const allLostPks: string[] = [];

  for (const a of accounts) {
    const unseenThisRun = a.lastSeenAt < runStartedAt;
    const wasLost = a.lostAt !== null;

    if (unseenThisRun && !wasLost) {
      newlyLostPks.push(a.pk);
      allLostPks.push(a.pk);
    } else if (unseenThisRun && wasLost) {
      allLostPks.push(a.pk);
    } else if (!unseenThisRun && wasLost) {
      newlyRecoveredPks.push(a.pk);
    }
  }

  if (newlyLostPks.length > 0) {
    await prisma.account.updateMany({
      where: { profileId, pk: { in: newlyLostPks } },
      data: { lostAt: runCompletedAt },
    });
  }
  if (newlyRecoveredPks.length > 0) {
    await prisma.account.updateMany({
      where: { profileId, pk: { in: newlyRecoveredPks } },
      data: { lostAt: null, recoveredAt: runCompletedAt },
    });
  }

  return { allLostPks, newlyLostPks, newlyRecoveredPks };
}

/** Best-effort: populate a profile's avatar from the logged-in IG account. */
async function fillProfileAvatarIfNeeded(
  profileId: string,
  cookie: string,
  userAgent?: string
): Promise<void> {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: { avatarUrl: true },
    });
    if (profile?.avatarUrl) return; // already set

    const user = await fetchLoggedInUser(cookie, userAgent);
    if (!user) return;

    await prisma.profile.update({
      where: { id: profileId },
      data: {
        avatarUrl: user.profilePicUrl,
        igUserPk: user.pk,
        igUsername: user.username || null,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    logger.warn({ err, profileId }, "[scraper] Avatar auto-fill failed");
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
