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

/** Shared guard: a profile may only have one scrape in flight. */
function assertNoRunInFlight(profileId: string): void {
  if (getRuntime(profileId)?.state.status === "running") {
    throw new Error("A scrape is already in progress for this profile");
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

export async function runScrape(profileId: string): Promise<number> {
  assertNoRunInFlight(profileId);

  const { cookie, userAgent } = await loadScrapableProfile(profileId);

  const runId = await getNextScrapeRunId();
  const run = await prisma.scrapeRun.create({
    data: {
      id: runId,
      profileId,
      startedAt: new Date().toISOString(),
      status: "running",
    },
  });

  const runtime = createRuntime(run.id, profileId);
  registerRuntime(profileId, runtime);

  scrapeAllPages(runtime, cookie, userAgent, run.startedAt).catch((error) => {
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
  assertNoRunInFlight(profileId);

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

  await prisma.scrapeRun.update({
    where: { id: run.id },
    data: {
      status: "running",
      completedAt: null,
      resumeCount: (run.resumeCount ?? 0) + 1,
      lastResumedAt: new Date().toISOString(),
    },
  });

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
