/**
 * Every terminal write to a `ScrapeRun` row: failure, cancellation, success.
 *
 * Split out from `run-lifecycle` to break a cycle — `run-lifecycle` starts the
 * page loop, and the page loop needs these three writers.
 */

import { prisma } from "../prisma";
import { classifyScrapeError, type ScrapeErrorKind } from "../instagram-api";
import { logger } from "../logger";
import { extractErrorInfo } from "./errors";
import type { LostState, Runtime } from "./types";

/**
 * Park a failed run. A rate limit or a dropped connection leaves the
 * checkpoint valid, so the run becomes `interrupted` (resumable) rather than
 * `failed`. Only a dead cookie or a genuinely unexpected error is terminal —
 * resuming those would just fail again at the same page.
 */
export async function handleScrapeFailure(
  runtime: Runtime,
  error: unknown
): Promise<void> {
  const { runId, profileId } = runtime.state;
  const { errorMsg, errorBody } = extractErrorInfo(error);
  const kind: ScrapeErrorKind = classifyScrapeError(error);

  const existing = await prisma.scrapeRun
    .findUnique({ where: { id: runId }, select: { checkpointMaxId: true } })
    .catch(() => null);
  const resumable =
    (kind === "rate_limited" || kind === "transient") &&
    Boolean(existing?.checkpointMaxId);

  const status = resumable ? "interrupted" : "failed";
  const now = new Date().toISOString();

  logger.error(
    { err: error, runId, profileId, kind, status },
    "[scraper] Scrape run stopped on error"
  );

  await prisma.scrapeRun
    .update({
      where: { id: runId },
      data: {
        status,
        // An interrupted run isn't finished, so it keeps no completion time.
        completedAt: resumable ? null : now,
        errorMessage: errorMsg,
        errorBody,
        errorKind: kind,
        lastErrorAt: now,
        retryCount: runtime.retryCount,
      },
    })
    .catch(() => {});

  runtime.state.status = status;
}

/**
 * Stop a run at the user's request, keeping the checkpoint so it can be
 * resumed. Lost-state is deliberately not calculated — the feed was only
 * partially walked, so every unvisited account would look missing.
 */
export async function markCancelled(runtime: Runtime): Promise<void> {
  const { runId, profileId } = runtime.state;
  await prisma.scrapeRun
    .update({
      where: { id: runId },
      data: {
        status: "cancelled",
        completedAt: new Date().toISOString(),
        pagesScraped: runtime.state.pagesScraped,
        totalPostsFound: runtime.state.totalPostsFound,
        newPostsAdded: runtime.state.newPostsAdded,
        newAccountsFound: runtime.state.newAccountsFound,
        retryCount: runtime.retryCount,
      },
    })
    .catch(() => {});

  runtime.state.status = "cancelled";
  logger.info(
    { runId, profileId, pagesScraped: runtime.state.pagesScraped },
    "[scraper] Scrape cancelled by request"
  );
}

/** JSON array column, or null when there is nothing to record. */
function pksColumn(pks: string[]): string | null {
  return pks.length > 0 ? JSON.stringify(pks) : null;
}

/** Write the final summary of a run that walked the whole feed. */
export async function finalizeCompletedRun(
  runtime: Runtime,
  lostState: LostState,
  completedAt: string,
  usernameChangePks: string[]
): Promise<void> {
  await prisma.scrapeRun.update({
    where: { id: runtime.state.runId },
    data: {
      status: "completed",
      completedAt,
      totalPostsFound: runtime.state.totalPostsFound,
      newPostsAdded: runtime.state.newPostsAdded,
      newAccountsFound: runtime.state.newAccountsFound,
      pagesScraped: runtime.state.pagesScraped,
      checkpointMaxId: null,
      retryCount: runtime.retryCount,
      // A run that recovered and finished shouldn't still show its old error.
      errorMessage: null,
      errorBody: null,
      errorKind: null,
      lostAccountsCount: lostState.allLostPks.length,
      lostAccountPks: pksColumn(lostState.allLostPks),
      newlyLostAccountsCount: lostState.newlyLostPks.length,
      newlyLostAccountPks: pksColumn(lostState.newlyLostPks),
      newlyRecoveredAccountsCount: lostState.newlyRecoveredPks.length,
      newlyRecoveredAccountPks: pksColumn(lostState.newlyRecoveredPks),
      usernameChangesCount: usernameChangePks.length,
      usernameChangeAccountPks: pksColumn(usernameChangePks),
    },
  });

  runtime.state.status = "completed";
}
