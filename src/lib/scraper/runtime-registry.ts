/**
 * The single source of truth for in-flight scrapes.
 *
 * This module owns the one and only `runtimes` map. Every other module reaches
 * it through the accessors below — a second copy of this map would silently
 * break cancellation and orphan detection. It imports nothing from the other
 * scraper modules, so it can never take part in an import cycle.
 */

import { prisma } from "../prisma";
import type { Runtime, ScrapeProgress } from "./types";

// Each profile gets its own runtime so scrapes are fully independent.
//
// Entries are never removed: a finished runtime stays in the map with its
// terminal status, so `getCurrentScrapeState` can still report the last known
// result after the run ends.
const runtimes = new Map<string, Runtime>();

export function getRuntime(profileId: string): Runtime | undefined {
  return runtimes.get(profileId);
}

export function registerRuntime(profileId: string, runtime: Runtime): void {
  runtimes.set(profileId, runtime);
}

export function createRuntime(runId: number, profileId: string): Runtime {
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
    usernameChanges: new Set<string>(),
    profilePicHashCache: new Map<string, string | null>(),
    cancelRequested: false,
    retryCount: 0,
  };
}

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

/**
 * Ask the in-flight scrape for a profile to stop after the current page. The
 * checkpoint is kept, so a cancelled run stays resumable.
 *
 * `runId` must match the run actually in flight, so a stale Cancel button on
 * an older run cannot stop a newer one.
 */
export function requestScrapeCancel(
  profileId: string,
  runId: number
): { ok: true } | { ok: false; reason: string } {
  const runtime = runtimes.get(profileId);
  if (!runtime || runtime.state.status !== "running") {
    return { ok: false, reason: "No scrape is currently running for this profile" };
  }
  if (runtime.state.runId !== runId) {
    return {
      ok: false,
      reason: `Run #${runId} is not the one currently running (#${runtime.state.runId})`,
    };
  }
  runtime.cancelRequested = true;
  return { ok: true };
}
