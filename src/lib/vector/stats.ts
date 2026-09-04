import { prisma } from "@/lib/prisma";

export interface VectorIndexStats {
  profileId: string;
  status: "running" | "completed" | "failed";
  lastRunAt: string | null;
  lastCompletedAt: string | null;
  durationMs: number | null;
  /** Newest post included in this run, for "index is current up to…" display. */
  cutoffPostDate: string | null;
  totalItems: number;
  indexedItems: number;
  facesIndexed: number;
  failedItems: number;
  lastError: string | null;
  updatedAt: string;
}

const statsKey = (profileId: string) => `vector_index_stats_${profileId}`;

export async function getProfileVectorStats(profileId: string): Promise<VectorIndexStats | null> {
  try {
    const setting = await prisma.setting.findUnique({ where: { key: statsKey(profileId) } });
    return setting?.value ? (JSON.parse(setting.value) as VectorIndexStats) : null;
  } catch {
    return null;
  }
}

export async function saveProfileVectorStats(stats: VectorIndexStats): Promise<void> {
  const now = new Date().toISOString();
  stats.updatedAt = now;
  const key = statsKey(stats.profileId);
  const value = JSON.stringify(stats);

  try {
    await prisma.setting.upsert({
      where: { key },
      update: { value, updatedAt: now },
      create: { key, value, updatedAt: now },
    });
  } catch (err) {
    console.error("[vector-stats] Failed to persist vector stats:", err);
  }
}
