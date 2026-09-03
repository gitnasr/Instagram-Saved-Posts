import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { VectorIndexProgress } from "@/types";
import { embedImageFromUrl } from "./image-embedding";
import { detectFacesFromUrl } from "./face-embedding";
import {
  COLLECTIONS,
  ensureCollections,
  getQdrantConfig,
  isQdrantConfigured,
  pointId,
  upsertPoints,
  type FaceVectorPayload,
  type PostVectorPayload,
} from "./qdrant-client";
import { saveProfileVectorStats, type VectorIndexStats } from "./stats";

// Per-profile index state in memory for real-time polling
const indexStates = new Map<string, VectorIndexProgress>();

export function getCurrentIndexState(profileId: string): VectorIndexProgress | null {
  return indexStates.get(profileId) ?? null;
}

interface IndexTarget {
  postPk: string;
  mediaType: number;
  source: "thumbnail" | "carousel";
  position: number;
  imageUrl: string;
}

/**
 * Collects target preview images to embed. Supports Cloudinary CDN URLs as
 * first preference, with automatic fallback to direct/proxied thumbnail URLs
 * so indexing functions properly even without Cloudinary configured.
 */
async function collectTargets(profileId: string): Promise<IndexTarget[]> {
  const targets: IndexTarget[] = [];

  const posts = await prisma.post.findMany({
    where: {
      profileId,
      OR: [
        { cloudinaryThumbnailUrl: { not: null } },
        { thumbnailUrl: { not: null } },
      ],
    },
    select: { pk: true, mediaType: true, cloudinaryThumbnailUrl: true, thumbnailUrl: true },
  });

  for (const post of posts) {
    const imageUrl = post.cloudinaryThumbnailUrl || post.thumbnailUrl;
    if (!imageUrl) continue;
    targets.push({
      postPk: post.pk,
      mediaType: post.mediaType,
      source: "thumbnail",
      position: 0,
      imageUrl,
    });
  }

  const carouselItems = await prisma.carouselMedia.findMany({
    where: {
      profileId,
      mediaType: { not: 2 }, // Exclude standalone video slides
      OR: [
        { cloudinaryUrl: { not: null } },
        { mediaUrl: { not: "" } },
      ],
    },
    select: { postPk: true, mediaType: true, position: true, cloudinaryUrl: true, mediaUrl: true },
  });

  for (const item of carouselItems) {
    const imageUrl = item.cloudinaryUrl || item.mediaUrl;
    if (!imageUrl) continue;
    targets.push({
      postPk: item.postPk,
      mediaType: item.mediaType,
      source: "carousel",
      position: item.position,
      imageUrl,
    });
  }

  return targets;
}

const UPSERT_BATCH_SIZE = 25;

export async function runVectorIndex(profileId: string): Promise<void> {
  if (indexStates.get(profileId)?.status === "running") {
    throw new Error("A vector index run is already in progress for this profile");
  }

  const qdrantConfig = getQdrantConfig();
  if (!isQdrantConfigured(qdrantConfig)) {
    throw new Error("Qdrant is not configured. Set QDRANT_URL/QDRANT_API_KEY env vars.");
  }

  const startTime = Date.now();
  const startIso = new Date(startTime).toISOString();

  // Find profile name and newest post timestamp for cutoff tracking
  const [profileRecord, newestPost] = await Promise.all([
    prisma.profile.findUnique({ where: { id: profileId }, select: { name: true } }),
    prisma.post.findFirst({
      where: { profileId },
      orderBy: { takenAt: "desc" },
      select: { takenAt: true },
    }),
  ]);

  const cutoffPostTakenAt = newestPost?.takenAt ?? null;
  const cutoffPostDate = cutoffPostTakenAt
    ? new Date(cutoffPostTakenAt * 1000).toISOString()
    : null;

  const targets = await collectTargets(profileId);

  const state: VectorIndexProgress = {
    status: "running",
    totalItems: targets.length,
    indexedItems: 0,
    facesIndexed: 0,
    failedItems: 0,
  };
  indexStates.set(profileId, state);

  // Initial stats record
  const currentStats: VectorIndexStats = {
    profileId,
    profileName: profileRecord?.name ?? profileId,
    status: "running",
    lastRunAt: startIso,
    lastCompletedAt: null,
    durationMs: null,
    cutoffPostTakenAt,
    cutoffPostDate,
    totalItems: targets.length,
    indexedItems: 0,
    facesIndexed: 0,
    failedItems: 0,
    lastError: null,
    updatedAt: startIso,
  };
  await saveProfileVectorStats(currentStats);

  try {
    await ensureCollections();

    // Batched queues to avoid RocksDB open file limits and connection saturation
    const imageBatch: { id: string; vector: number[]; payload: Record<string, unknown> }[] = [];
    const faceBatch: { id: string; vector: number[]; payload: Record<string, unknown> }[] = [];

    const flushBatches = async (force = false) => {
      if (imageBatch.length >= UPSERT_BATCH_SIZE || (force && imageBatch.length > 0)) {
        await upsertPoints(COLLECTIONS.POST_IMAGES, [...imageBatch]);
        imageBatch.length = 0;
      }
      if (faceBatch.length >= UPSERT_BATCH_SIZE || (force && faceBatch.length > 0)) {
        await upsertPoints(COLLECTIONS.POST_FACES, [...faceBatch]);
        faceBatch.length = 0;
      }
    };

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      try {
        const imagePayload: PostVectorPayload = {
          profileId,
          postPk: target.postPk,
          mediaType: target.mediaType,
          source: target.source,
          carouselPosition: target.position,
        };

        const imageVector = await embedImageFromUrl(target.imageUrl);
        imageBatch.push({
          id: pointId(profileId, target.postPk, target.source, target.position),
          vector: imageVector,
          payload: imagePayload,
        });

        const faces = await detectFacesFromUrl(target.imageUrl);
        if (faces.length > 0) {
          for (let faceIdx = 0; faceIdx < faces.length; faceIdx++) {
            const face = faces[faceIdx];
            const payload: FaceVectorPayload = { ...imagePayload, bbox: face.bbox };
            faceBatch.push({
              id: pointId(profileId, target.postPk, target.source, target.position, faceIdx),
              vector: face.descriptor,
              payload,
            });
          }
          state.facesIndexed += faces.length;
        }

        state.indexedItems += 1;
        await flushBatches(false);

        // Periodically sync stats every 50 items
        if (i > 0 && i % 50 === 0) {
          currentStats.indexedItems = state.indexedItems;
          currentStats.facesIndexed = state.facesIndexed;
          currentStats.failedItems = state.failedItems;
          await saveProfileVectorStats(currentStats);
        }
      } catch (error) {
        state.failedItems += 1;
        currentStats.lastError = error instanceof Error ? error.message : String(error);
        logger.error(
          { err: error, profileId, postPk: target.postPk, source: target.source },
          "[vector-index] Failed to index item"
        );
      }
    }

    // Flush any remaining batched points
    await flushBatches(true);

    const completionIso = new Date().toISOString();
    state.status = "completed";
    currentStats.status = "completed";
    currentStats.lastCompletedAt = completionIso;
    currentStats.durationMs = Date.now() - startTime;
    currentStats.indexedItems = state.indexedItems;
    currentStats.facesIndexed = state.facesIndexed;
    currentStats.failedItems = state.failedItems;
    await saveProfileVectorStats(currentStats);

    logger.info(
      {
        profileId,
        indexedItems: state.indexedItems,
        facesIndexed: state.facesIndexed,
        failedItems: state.failedItems,
        durationMs: currentStats.durationMs,
      },
      "[vector-index] Index run completed"
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    state.status = "failed";
    state.errorMessage = errorMsg;
    currentStats.status = "failed";
    currentStats.lastError = errorMsg;
    currentStats.durationMs = Date.now() - startTime;
    await saveProfileVectorStats(currentStats);

    logger.error({ err: error, profileId }, "[vector-index] Index run failed");
  }
}
