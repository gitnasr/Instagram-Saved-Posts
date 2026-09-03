import { prisma } from "@/lib/prisma";

export interface VectorIndexStats {
  profileId: string;
  profileName?: string;
  status: "idle" | "running" | "completed" | "failed";
  lastRunAt: string | null;
  lastCompletedAt: string | null;
  durationMs: number | null;
  cutoffPostTakenAt: number | null;
  cutoffPostDate: string | null;
  totalItems: number;
  indexedItems: number;
  facesIndexed: number;
  failedItems: number;
  lastError: string | null;
  updatedAt: string;
}

const STATS_KEY_PREFIX = "vector_index_stats_";

export async function getProfileVectorStats(profileId: string): Promise<VectorIndexStats | null> {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: `${STATS_KEY_PREFIX}${profileId}` },
    });
    if (!setting?.value) return null;
    return JSON.parse(setting.value) as VectorIndexStats;
  } catch {
    return null;
  }
}

export async function saveProfileVectorStats(stats: VectorIndexStats): Promise<void> {
  const now = new Date().toISOString();
  stats.updatedAt = now;

  try {
    await prisma.setting.upsert({
      where: { key: `${STATS_KEY_PREFIX}${stats.profileId}` },
      update: {
        value: JSON.stringify(stats),
        updatedAt: now,
      },
      create: {
        key: `${STATS_KEY_PREFIX}${stats.profileId}`,
        value: JSON.stringify(stats),
        updatedAt: now,
      },
    });
  } catch (err) {
    console.error("[vector-stats] Failed to persist vector stats:", err);
  }
}

export async function getAllProfilesVectorStats(): Promise<VectorIndexStats[]> {
  try {
    const settings = await prisma.setting.findMany({
      where: { key: { startsWith: STATS_KEY_PREFIX } },
    });

    const list: VectorIndexStats[] = [];
    for (const s of settings) {
      try {
        list.push(JSON.parse(s.value));
      } catch {
        // Ignore corrupt record
      }
    }
    return list;
  } catch {
    return [];
  }
}
