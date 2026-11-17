/**
 * Public entry points that start work: beginning a fresh scrape and resuming
 * an interrupted one.
 *
 * Both validate the profile, register a runtime, then launch the page loop
 * *without awaiting it* — the run deliberately outlives the request that
 * started it, which is why the runtime registry exists at all.
 */

import { prisma, getNextScrapeRunId } from "../prisma";
import { scrapeAllPages } from "./page-loop";
import { handleScrapeFailure } from "./run-state";
import { createRuntime, getRuntime, registerRuntime } from "./runtime-registry";

// Profiles whose start/resume is between the guard and runtime registration.
// Both entry points await before registering, so without this two quick
// requests (double click, auto + manual) would both pass the guard.
const starting = new Set<string>();

/** Shared guard: a profile may only have one scrape in flight or starting. */
async function withStartLock<T>(
  profileId: string,
  start: () => Promise<T>
): Promise<T> {
  if (starting.has(profileId) || getRuntime(profileId)?.state.status === "running") {
    throw new Error("A scrape is already in progress for this profile");
  }
  starting.add(profileId);
  try {
    return await start();
  } finally {
    starting.delete(profileId);
  }
}

/**
 * Load a profile and its cookie, or explain what the user has to fix.
 * Returns the cookie separately so callers get it already narrowed to string.
 */
async function loadScrapableProfile(
  profileId: string
): Promise<{ cookie: string; userAgent: string | undefined }> {
  const profile = await prisma.profile.findUnique({ where: { id: profileId } });
  if (!profile) {
    throw new Error("Profile not found");
  }
  if (!profile.instagramCookie) {
    throw new Error(
      "No Instagram cookie configured for this profile. Go to Settings first."
    );
  }
  return {
    cookie: profile.instagramCookie,
    userAgent: profile.userAgent ?? undefined,
  };
}

export function runScrape(profileId: string): Promise<number> {
  return withStartLock(profileId, async () => {
    const { cookie, userAgent } = await loadScrapableProfile(profileId);

    const runId = await getNextScrapeRunId();
    const startedAt = new Date().toISOString();

    // Register before the row exists as "running": the orphan sweep treats any
    // running row without a live runtime as interrupted, so the other order
    // lets a concurrent status poll mislabel a run that is starting.
    const runtime = createRuntime(runId, profileId);
    registerRuntime(profileId, runtime);

    try {
      await prisma.scrapeRun.create({
        data: { id: runId, profileId, startedAt, status: "running" },
      });
    } catch (error) {
      // No row, no run: don't leave a phantom "running" runtime blocking the profile.
      runtime.state.status = "failed";
      throw error;
    }

    scrapeAllPages(runtime, cookie, userAgent, startedAt).catch((error) => {
      void handleScrapeFailure(runtime, error);
    });

    return runId;
  });
}

/**
 * Resume an interrupted scrape from its saved checkpoint cursor.
 */
export function resumeScrape(profileId: string, runId: number): Promise<void> {
  return withStartLock(profileId, () => doResume(profileId, runId));
}

async function doResume(profileId: string, runId: number): Promise<void> {
  const run = await prisma.scrapeRun.findFirst({
    where: { id: runId, profileId },
  });

  if (!run) throw new Error("Scrape run not found");
  if (run.status === "running")
    throw new Error("This run is already in progress");
  if (run.status === "completed")
    throw new Error("This run already completed");
  // Any stopped run still holding a cursor can be picked back up — including
  // ones marked `failed` before failures were classified.
  if (!run.checkpointMaxId)
    throw new Error("This run has no checkpoint to resume from");

  const { cookie, userAgent } = await loadScrapableProfile(profileId);

  const runtime = createRuntime(run.id, profileId);
  runtime.state.pagesScraped = run.pagesScraped;
  runtime.state.totalPostsFound = run.totalPostsFound;
  runtime.state.newPostsAdded = run.newPostsAdded;
  runtime.state.newAccountsFound = run.newAccountsFound;
  runtime.retryCount = run.retryCount ?? 0;

  // Username changes detected before the interruption are already persisted;
  // without this the completion summary would only count the resumed segment.
  const priorUsernameChanges = await prisma.accountUsernameHistory.findMany({
    where: { profileId, scrapeRunId: run.id },
    select: { accountPk: true },
  });
  for (const change of priorUsernameChanges) {
    runtime.usernameChanges.add(change.accountPk);
  }

  registerRuntime(profileId, runtime);

  try {
    await prisma.scrapeRun.update({
      where: { id: run.id },
      data: {
        status: "running",
        completedAt: null,
        resumeCount: (run.resumeCount ?? 0) + 1,
        lastResumedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    // The row never left its stopped state; release the profile instead of
    // leaving a "running" runtime with no loop behind it.
    runtime.state.status = run.status;
    throw error;
  }

  scrapeAllPages(
    runtime,
    cookie,
    userAgent,
    run.startedAt,
    run.checkpointMaxId ?? undefined
  ).catch((error) => {
    void handleScrapeFailure(runtime, error);
  });
}
