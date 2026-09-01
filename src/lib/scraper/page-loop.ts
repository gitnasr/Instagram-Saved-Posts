/**
 * The pagination loop: walk the saved-posts feed page by page, checkpointing
 * after each one, and run the completion epilogue when the feed is exhausted.
 *
 * Launched un-awaited by `run-lifecycle`, so the run outlives the HTTP request
 * that started it.
 */

import { prisma } from "../prisma";
import { fetchSavedPostsPage } from "../instagram-api";
import { getCloudinaryConfig, isCloudinaryConfigured } from "../cloudinary";
import { runCloudinarySync } from "../cloudinary-sync";
import { logger } from "../logger";
import { delay } from "../async";
import { SCRAPE_DELAY_MIN_MS, SCRAPE_DELAY_MAX_MS } from "../constants";
import { fillProfileAvatarIfNeeded } from "./avatar-fill";
import { calculateAndUpdateLostState } from "./lost-state";
import { processMediaItem } from "./media-processor";
import { recalculateAccountPostCounts } from "./post-sync";
import {
  finalizeCompletedRun,
  handleScrapeFailure,
  markCancelled,
} from "./run-state";
import type { LostState, Runtime } from "./types";

/** Jittered pause between pages, so the request pattern isn't metronomic. */
function interPageDelay(): Promise<void> {
  return delay(
    SCRAPE_DELAY_MIN_MS +
      Math.random() * (SCRAPE_DELAY_MAX_MS - SCRAPE_DELAY_MIN_MS)
  );
}

export async function scrapeAllPages(
  runtime: Runtime,
  cookie: string,
  userAgent?: string,
  runStartedAt?: string,
  resumeFromMaxId?: string
): Promise<void> {
  const { runId } = runtime.state;
  let maxId: string | undefined = resumeFromMaxId;
  let hasMore = true;

  try {
    while (hasMore) {
      if (runtime.cancelRequested) {
        await markCancelled(runtime);
        return;
      }

      const page = await fetchSavedPostsPage({
        cookie,
        userAgent,
        maxId,
        onRetry: ({ waitMs, kind }) => {
          runtime.retryCount += 1;
          logger.info(
            { runId, kind, waitMs, retryCount: runtime.retryCount },
            "[scraper] Retrying page after Instagram error"
          );
        },
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
          retryCount: runtime.retryCount,
        },
      });

      if (hasMore) {
        await interPageDelay();
      }
    }

    await finishRun(runtime, cookie, userAgent, runStartedAt);
  } catch (error) {
    await handleScrapeFailure(runtime, error);
  }
}

/** Epilogue for a run that walked the entire feed. */
async function finishRun(
  runtime: Runtime,
  cookie: string,
  userAgent: string | undefined,
  runStartedAt: string | undefined
): Promise<void> {
  const { runId, profileId } = runtime.state;

  await recalculateAccountPostCounts(profileId);

  // Calculate & persist lost-state transitions (only on full success).
  const runCompletedAt = new Date().toISOString();
  const lostState: LostState = runStartedAt
    ? await calculateAndUpdateLostState(profileId, runStartedAt, runCompletedAt)
    : { allLostPks: [], newlyLostPks: [], newlyRecoveredPks: [] };
  const usernameChangePks = [...runtime.usernameChanges];

  await finalizeCompletedRun(
    runtime,
    lostState,
    runCompletedAt,
    usernameChangePks
  );

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
      logger.warn({ err }, "[scraper] Auto Cloudinary sync failed to start");
    });
  }
}
