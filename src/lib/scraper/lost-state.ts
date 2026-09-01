/**
 * "Lost" accounts: ones whose saved posts no longer appear in the feed.
 *
 * This is derived analytics, computed once at the end of a fully completed
 * run — a partially walked feed would flag every unvisited account as missing.
 */

import { prisma } from "../prisma";
import { recordBulkAccountEvents } from "../account-events";
import type { LostState } from "./types";

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
export async function calculateAndUpdateLostState(
  profileId: string,
  runStartedAt: string,
  runCompletedAt: string
): Promise<LostState> {
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
    await recordBulkAccountEvents(profileId, newlyLostPks, "lost", runCompletedAt);
  }
  if (newlyRecoveredPks.length > 0) {
    await prisma.account.updateMany({
      where: { profileId, pk: { in: newlyRecoveredPks } },
      data: { lostAt: null, recoveredAt: runCompletedAt },
    });
    await recordBulkAccountEvents(
      profileId,
      newlyRecoveredPks,
      "recovered",
      runCompletedAt
    );
  }

  return { allLostPks, newlyLostPks, newlyRecoveredPks };
}
